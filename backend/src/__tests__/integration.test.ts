/**
 * Integration Tests
 * Tests complete user workflows end-to-end
 */

import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';
import { File } from '../models/File';
import { SystemSettings } from '../models/SystemSettings';
import userRoutes from '../routes/userRoutes';
import fileRoutes from '../routes/fileRoutes';
import { errorHandler } from '../middlewares/errorMiddleware';
import { MfaService } from '../services/MfaService';
import multer from 'multer';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Create full app instance for integration tests
const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Minimal rate limiting for tests
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // High limit for tests
    skip: () => true, // Skip rate limiting in tests
  });
  app.use(limiter);

  // Routes
  app.use('/api/users', userRoutes);
  app.use('/api/files', fileRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // Error handling
  app.use(errorHandler);

  return app;
};

describe('Integration Tests', () => {
  let app: express.Application;
  let userRepository: any;
  let fileRepository: any;
  let settingsRepository: any;

  beforeAll(async () => {
    app = createApp();

    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
    } catch (error) {
      console.warn('Database not available for testing, skipping integration tests');
      return;
    }

    userRepository = AppDataSource.getRepository(User);
    fileRepository = AppDataSource.getRepository(File);
    settingsRepository = AppDataSource.getRepository(SystemSettings);
  });

  beforeEach(async () => {
    if (!AppDataSource.isInitialized) return;

    // Clean up all tables
    await fileRepository.delete({});
    await userRepository.delete({});
    await settingsRepository.delete({});

    // Create default system settings
    const settings = new SystemSettings();
    settings.allowRegistration = true;
    await settingsRepository.save(settings);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('Complete User Journey', () => {
    it('should handle full user lifecycle', async () => {
      if (!AppDataSource.isInitialized) return;

      // 1. Health check
      const healthResponse = await request(app).get('/health').expect(200);

      expect(healthResponse.body.status).toBe('ok');

      // 2. User registration
      const userData = {
        email: 'integration@example.com',
        password: 'SecurePass123!',
        firstName: 'Integration',
        lastName: 'Test',
      };

      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.email).toBe(userData.email);
      expect(registerResponse.body.role).toBe(UserRole.ADMIN); // First user is admin

      // 3. User login
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      const { token } = loginResponse.body;
      expect(token).toBeDefined();

      // 4. Get user profile
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(userData.email);
      expect(profileResponse.body.firstName).toBe(userData.firstName);

      // 5. Update profile
      const updateResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          themePreference: 'dark',
        })
        .expect(200);

      expect(updateResponse.body.firstName).toBe('Updated');
      expect(updateResponse.body.themePreference).toBe('dark');

      // 6. Change password
      const passwordResponse = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'NewSecurePass456!',
        })
        .expect(200);

      expect(passwordResponse.body.success).toBe(true);

      // 7. Login with new password
      const newLoginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: 'NewSecurePass456!',
        })
        .expect(200);

      expect(newLoginResponse.body.token).toBeDefined();
    });

    it('should handle complete MFA workflow', async () => {
      if (!AppDataSource.isInitialized) return;

      // 1. Register and login user
      const userData = {
        email: 'mfa@example.com',
        password: 'SecurePass123!',
        firstName: 'MFA',
        lastName: 'User',
      };

      await request(app).post('/api/users/register').send(userData).expect(201);

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const { token } = loginResponse.body;

      // 2. Setup MFA
      const setupResponse = await request(app)
        .get('/api/users/mfa/setup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(setupResponse.body.secret).toBeDefined();
      expect(setupResponse.body.qrCode).toBeDefined();

      // 3. Enable MFA with valid token
      const user = await userRepository.findOne({ where: { email: userData.email } });
      const validToken = MfaService.generateToken(user.mfaSecret);

      const enableResponse = await request(app)
        .post('/api/users/mfa/enable')
        .set('Authorization', `Bearer ${token}`)
        .send({ token: validToken })
        .expect(200);

      expect(enableResponse.body.success).toBe(true);

      // 4. Check MFA status
      const statusResponse = await request(app)
        .get('/api/users/mfa/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(statusResponse.body.mfaEnabled).toBe(true);
      expect(statusResponse.body.hasBackupCodes).toBe(true);

      // 5. Generate backup codes
      const backupResponse = await request(app)
        .post('/api/users/mfa/backup-codes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(backupResponse.body.backupCodes).toBeDefined();
      expect(backupResponse.body.backupCodes.length).toBe(10);

      // 6. Login now requires MFA
      const mfaLoginResponse = await request(app)
        .post('/api/users/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(mfaLoginResponse.body.requiresMfa).toBe(true);
      expect(mfaLoginResponse.body.token).toBeUndefined();

      // 7. Complete MFA verification
      const updatedUser = await userRepository.findOne({ where: { email: userData.email } });
      const mfaToken = MfaService.generateToken(updatedUser.mfaSecret);

      const verifyResponse = await request(app)
        .post('/api/users/verify-mfa')
        .send({
          email: userData.email,
          token: mfaToken,
          isBackupCode: false,
        })
        .expect(200);

      expect(verifyResponse.body.token).toBeDefined();
      expect(verifyResponse.body.user.email).toBe(userData.email);

      // 8. Disable MFA
      const disableResponse = await request(app)
        .post('/api/users/mfa/disable')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(disableResponse.body.success).toBe(true);
    });

    it('should handle file management workflow', async () => {
      if (!AppDataSource.isInitialized) return;

      // 1. Register and login
      const userData = {
        email: 'fileuser@example.com',
        password: 'SecurePass123!',
        firstName: 'File',
        lastName: 'User',
      };

      await request(app).post('/api/users/register').send(userData).expect(201);

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const { token } = loginResponse.body;

      // 2. Check initial empty file list
      const emptyFilesResponse = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(emptyFilesResponse.body).toEqual([]);

      // 3. Upload a file
      const testContent = 'Integration test file content';
      const testFilePath = path.join(__dirname, 'integration-test.txt');
      await fs.writeFile(testFilePath, testContent);

      try {
        const uploadResponse = await request(app)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', testFilePath)
          .field('description', 'Integration test file')
          .expect(201);

        const fileId = uploadResponse.body.file.id;
        expect(uploadResponse.body.message).toBe('File uploaded successfully');

        // 4. List files (should show uploaded file)
        const filesResponse = await request(app)
          .get('/api/files')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(filesResponse.body.length).toBe(1);
        expect(filesResponse.body[0].description).toBe('Integration test file');

        // 5. Download the file
        const downloadResponse = await request(app)
          .get(`/api/files/download/${fileId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(downloadResponse.text).toBe(testContent);

        // 6. Delete the file
        const deleteResponse = await request(app)
          .delete(`/api/files/${fileId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(deleteResponse.body.message).toBe('File deleted successfully');

        // 7. Verify file is gone
        const finalFilesResponse = await request(app)
          .get('/api/files')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(finalFilesResponse.body).toEqual([]);
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    it('should handle admin workflow', async () => {
      if (!AppDataSource.isInitialized) return;

      // 1. Register admin user (first user)
      const adminData = {
        email: 'admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
      };

      await request(app).post('/api/users/register').send(adminData).expect(201);

      const adminLoginResponse = await request(app)
        .post('/api/users/login')
        .send({ email: adminData.email, password: adminData.password })
        .expect(200);

      const adminToken = adminLoginResponse.body.token;

      // 2. Register regular user
      const regularUserData = {
        email: 'regular@example.com',
        password: 'RegularPass123!',
        firstName: 'Regular',
        lastName: 'User',
      };

      const userRegisterResponse = await request(app)
        .post('/api/users/register')
        .send(regularUserData)
        .expect(201);

      expect(userRegisterResponse.body.role).toBe(UserRole.USER);

      // 3. Admin gets all users
      const usersResponse = await request(app)
        .get('/api/users/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.length).toBe(2);
      expect(usersResponse.body.some((u: any) => u.role === UserRole.ADMIN)).toBe(true);
      expect(usersResponse.body.some((u: any) => u.role === UserRole.USER)).toBe(true);

      // 4. Admin checks system settings
      const settingsResponse = await request(app)
        .get('/api/users/system-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(settingsResponse.body.allowRegistration).toBe(true);

      // 5. Admin disables registration
      const updateSettingsResponse = await request(app)
        .put('/api/users/system-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ allowRegistration: false })
        .expect(200);

      expect(updateSettingsResponse.body.success).toBe(true);

      // 6. Verify registration is now blocked
      const blockedRegisterResponse = await request(app)
        .post('/api/users/register')
        .send({
          email: 'blocked@example.com',
          password: 'BlockedPass123!',
          firstName: 'Blocked',
          lastName: 'User',
        })
        .expect(403);

      expect(blockedRegisterResponse.body.message).toBe('User registration is currently disabled');

      // 7. Re-enable registration
      await request(app)
        .put('/api/users/system-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ allowRegistration: true })
        .expect(200);
    });
  });

  describe('Security & Authorization Tests', () => {
    let regularUserToken: string;
    let adminToken: string;

    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Create admin user
      const admin = new User();
      admin.email = 'admin@example.com';
      admin.password = 'AdminPass123!';
      admin.firstName = 'Admin';
      admin.lastName = 'User';
      admin.role = UserRole.ADMIN;
      await admin.hashPassword();
      const savedAdmin = await userRepository.save(admin);

      // Create regular user
      const regular = new User();
      regular.email = 'regular@example.com';
      regular.password = 'RegularPass123!';
      regular.firstName = 'Regular';
      regular.lastName = 'User';
      regular.role = UserRole.USER;
      await regular.hashPassword();
      const savedRegular = await userRepository.save(regular);

      // Generate tokens
      adminToken = require('jsonwebtoken').sign(
        { id: savedAdmin.id, email: savedAdmin.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      regularUserToken = require('jsonwebtoken').sign(
        { id: savedRegular.id, email: savedRegular.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
    });

    it('should enforce admin-only endpoints', async () => {
      if (!AppDataSource.isInitialized) return;

      // Regular user should not access admin endpoints
      await request(app)
        .get('/api/users/users')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      await request(app)
        .get('/api/users/system-settings')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      await request(app)
        .put('/api/users/system-settings')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ allowRegistration: false })
        .expect(403);

      // Admin should have access
      await request(app)
        .get('/api/users/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .get('/api/users/system-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should enforce file ownership', async () => {
      if (!AppDataSource.isInitialized) return;

      // Create file owned by regular user
      const regularUser = await userRepository.findOne({ where: { email: 'regular@example.com' } });
      const file = new File();
      file.filename = 'private-file.txt';
      file.originalName = 'private-file.txt';
      file.mimeType = 'text/plain';
      file.size = 100;
      file.path = '/uploads/private-file.txt';
      file.description = 'Private file';
      file.owner = regularUser;
      const savedFile = await fileRepository.save(file);

      // Admin should not be able to access user's files
      await request(app)
        .get(`/api/files/download/${savedFile.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      await request(app)
        .delete(`/api/files/${savedFile.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Regular user should be able to access their own files
      await request(app)
        .get(`/api/files/download/${savedFile.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);
    });

    it('should validate JWT tokens properly', async () => {
      if (!AppDataSource.isInitialized) return;

      // Test with malformed token
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test with missing token
      await request(app).get('/api/users/profile').expect(401);

      // Test with expired token (simulate)
      const expiredToken = require('jsonwebtoken').sign(
        { id: 'test-id', email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Already expired
      );

      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});
