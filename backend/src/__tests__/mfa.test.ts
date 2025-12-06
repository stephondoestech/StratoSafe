/**
 * MFA Controller Tests
 * Tests Multi-Factor Authentication setup, verification, and backup codes
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import {
  generateMfaSetup,
  verifyAndEnableMfa,
  disableMfa,
  getMfaStatus,
  generateBackupCodes,
  verifyMfaToken,
} from '../controllers/mfaController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { errorHandler } from '../middlewares/errorMiddleware';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';
import { MfaService } from '../services/MfaService';
import * as jwt from 'jsonwebtoken';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Setup MFA routes
  app.get('/mfa/setup', authMiddleware, generateMfaSetup);
  app.post('/mfa/enable', authMiddleware, verifyAndEnableMfa);
  app.post('/mfa/disable', authMiddleware, disableMfa);
  app.get('/mfa/status', authMiddleware, getMfaStatus);
  app.post('/mfa/backup-codes', authMiddleware, generateBackupCodes);
  app.post('/verify-mfa', verifyMfaToken);

  app.use(errorHandler);

  return app;
};

describe('MFA Controller', () => {
  let app: express.Application;
  let userRepository: any;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();

    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
    } catch (error) {
      console.warn('Database not available for testing, skipping MFA tests');
      return;
    }

    userRepository = AppDataSource.getRepository(User);
  });

  beforeEach(async () => {
    if (!AppDataSource.isInitialized) return;

    // Clean up
    await userRepository.delete({});

    // Create test user
    testUser = new User();
    testUser.email = 'test@example.com';
    testUser.password = 'SecurePass123!';
    testUser.firstName = 'John';
    testUser.lastName = 'Doe';
    testUser.role = UserRole.USER;
    await testUser.hashPassword();
    testUser = await userRepository.save(testUser);

    // Generate auth token
    authToken = jwt.sign({ id: testUser.id, email: testUser.email }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('GET /mfa/setup', () => {
    it('should generate MFA setup data', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .get('/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(response.body.message).toContain('Scan the QR code');
    });

    it('should require authentication', async () => {
      if (!AppDataSource.isInitialized) return;

      await request(app).get('/mfa/setup').expect(401);
    });

    it('should store secret temporarily', async () => {
      if (!AppDataSource.isInitialized) return;

      await request(app).get('/mfa/setup').set('Authorization', `Bearer ${authToken}`).expect(200);

      const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
      expect(updatedUser.mfaSecret).toBeDefined();
      expect(updatedUser.mfaEnabled).toBe(false); // Not enabled until verified
    });
  });

  describe('POST /mfa/enable', () => {
    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Setup MFA secret first
      await request(app).get('/mfa/setup').set('Authorization', `Bearer ${authToken}`);
    });

    it('should enable MFA with valid token', async () => {
      if (!AppDataSource.isInitialized) return;

      // Get the user with the secret
      const userWithSecret = await userRepository.findOne({ where: { id: testUser.id } });

      // Generate a valid TOTP token
      const validToken = MfaService.generateToken(userWithSecret.mfaSecret);

      const response = await request(app)
        .post('/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: validToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('MFA enabled successfully');
      expect(response.body.backupCodesCount).toBeGreaterThan(0);
    });

    it('should reject invalid token', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '123456' }) // Invalid token
        .expect(400);

      expect(response.body.message).toBe('Invalid token');
    });

    it('should require token', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // No token
        .expect(400);

      expect(response.body.message).toBe('Token is required');
    });
  });

  describe('POST /mfa/disable', () => {
    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Enable MFA first
      testUser.mfaEnabled = true;
      testUser.mfaSecret = 'test-secret';
      testUser.mfaBackupCodes = JSON.stringify(['code1', 'code2']);
      await userRepository.save(testUser);
    });

    it('should disable MFA successfully', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('MFA disabled successfully');

      // Verify MFA is disabled
      const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
      expect(updatedUser.mfaEnabled).toBe(false);
      expect(updatedUser.mfaSecret).toBeNull();
      expect(updatedUser.mfaBackupCodes).toBeNull();
    });

    it('should require authentication', async () => {
      if (!AppDataSource.isInitialized) return;

      await request(app).post('/mfa/disable').expect(401);
    });
  });

  describe('GET /mfa/status', () => {
    it('should return MFA status when disabled', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .get('/mfa/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.mfaEnabled).toBe(false);
      expect(response.body.hasBackupCodes).toBe(false);
    });

    it('should return MFA status when enabled', async () => {
      if (!AppDataSource.isInitialized) return;

      // Enable MFA
      testUser.mfaEnabled = true;
      testUser.mfaSecret = 'test-secret';
      testUser.mfaBackupCodes = JSON.stringify(['code1', 'code2']);
      await userRepository.save(testUser);

      const response = await request(app)
        .get('/mfa/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.mfaEnabled).toBe(true);
      expect(response.body.hasBackupCodes).toBe(true);
    });
  });

  describe('POST /mfa/backup-codes', () => {
    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Enable MFA first
      testUser.mfaEnabled = true;
      testUser.mfaSecret = 'test-secret';
      await userRepository.save(testUser);
    });

    it('should generate backup codes when MFA is enabled', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/mfa/backup-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.backupCodes).toBeDefined();
      expect(Array.isArray(response.body.backupCodes)).toBe(true);
      expect(response.body.backupCodes.length).toBe(10);
      expect(response.body.message).toContain('Keep them in a safe place');
    });

    it('should reject when MFA is not enabled', async () => {
      if (!AppDataSource.isInitialized) return;

      // Disable MFA
      testUser.mfaEnabled = false;
      await userRepository.save(testUser);

      const response = await request(app)
        .post('/mfa/backup-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toBe('MFA is not enabled');
    });
  });

  describe('POST /verify-mfa', () => {
    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Setup MFA-enabled user
      testUser.mfaEnabled = true;
      testUser.mfaSecret = MfaService.generateSecret(testUser.email);
      const backupCodes = await testUser.generateBackupCodes();
      await userRepository.save(testUser);
    });

    it('should verify valid TOTP token', async () => {
      if (!AppDataSource.isInitialized) return;

      const validToken = MfaService.generateToken(testUser.mfaSecret!);

      const response = await request(app)
        .post('/verify-mfa')
        .send({
          email: testUser.email,
          token: validToken,
          isBackupCode: false,
        })
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.mfaSecret).toBeUndefined();
    });

    it('should verify valid backup code', async () => {
      if (!AppDataSource.isInitialized) return;

      // Get the generated backup codes
      const userWithCodes = await userRepository.findOne({ where: { id: testUser.id } });
      const backupCodes = JSON.parse(userWithCodes.mfaBackupCodes);

      // Use the first backup code (we need the plain text version)
      // For testing, we'll simulate a known backup code
      const testBackupCode = 'TESTCODE1';

      // Manually set a known backup code for testing
      const bcrypt = require('bcrypt');
      const hashedTestCode = await bcrypt.hash(testBackupCode, 10);
      userWithCodes.mfaBackupCodes = JSON.stringify([hashedTestCode]);
      await userRepository.save(userWithCodes);

      const response = await request(app)
        .post('/verify-mfa')
        .send({
          email: testUser.email,
          token: testBackupCode,
          isBackupCode: true,
        })
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();

      // Verify backup code was consumed
      const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
      const remainingCodes = JSON.parse(updatedUser.mfaBackupCodes);
      expect(remainingCodes.length).toBe(0);
    });

    it('should reject invalid TOTP token', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/verify-mfa')
        .send({
          email: testUser.email,
          token: '123456', // Invalid token
          isBackupCode: false,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });

    it('should reject invalid backup code', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/verify-mfa')
        .send({
          email: testUser.email,
          token: 'INVALID_CODE',
          isBackupCode: true,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid backup code');
    });

    it('should reject unknown user', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/verify-mfa')
        .send({
          email: 'unknown@example.com',
          token: '123456',
          isBackupCode: false,
        })
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });
  });
});
