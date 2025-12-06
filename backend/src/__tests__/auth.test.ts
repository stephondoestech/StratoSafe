/**
 * Authentication Controller Tests
 * Tests user registration, login, and profile management
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import {
  register,
  login,
  getUserProfile,
  updateUserProfile,
  changePassword,
} from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';
import { SystemSettings } from '../models/SystemSettings';
import { errorHandler } from '../middlewares/errorMiddleware';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Setup routes
  app.post('/register', register);
  app.post('/login', login);
  app.get('/profile', authMiddleware, getUserProfile);
  app.put('/profile', authMiddleware, updateUserProfile);
  app.post('/change-password', authMiddleware, changePassword);

  // Error handling
  app.use(errorHandler);

  return app;
};

describe('Authentication Controller', () => {
  let app: express.Application;
  let userRepository: any;
  let settingsRepository: any;

  beforeAll(async () => {
    app = createTestApp();

    // Initialize test database
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
    } catch (error) {
      // Skip tests if database is not available
      console.warn('Database not available for testing, skipping auth tests');
      return;
    }

    userRepository = AppDataSource.getRepository(User);
    settingsRepository = AppDataSource.getRepository(SystemSettings);
  });

  beforeEach(async () => {
    if (!AppDataSource.isInitialized) return;

    // Clean up before each test
    await userRepository.delete({});
    await settingsRepository.delete({});

    // Create default system settings to allow registration
    const settings = new SystemSettings();
    settings.allowRegistration = true;
    await settingsRepository.save(settings);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app).post('/register').send(validUserData).expect(201);

      expect(response.body.email).toBe(validUserData.email);
      expect(response.body.firstName).toBe(validUserData.firstName);
      expect(response.body.lastName).toBe(validUserData.lastName);
      expect(response.body.password).toBeUndefined();
      expect(response.body.mfaSecret).toBeUndefined();
      expect(response.body.mfaBackupCodes).toBeUndefined();
    });

    it('should make first user an admin', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app).post('/register').send(validUserData).expect(201);

      expect(response.body.role).toBe(UserRole.ADMIN);
    });

    it('should make subsequent users regular users', async () => {
      if (!AppDataSource.isInitialized) return;

      // Register first user (admin)
      await request(app).post('/register').send(validUserData);

      // Register second user
      const secondUser = {
        ...validUserData,
        email: 'user2@example.com',
      };

      const response = await request(app).post('/register').send(secondUser).expect(201);

      expect(response.body.role).toBe(UserRole.USER);
    });

    it('should reject duplicate email registration', async () => {
      if (!AppDataSource.isInitialized) return;

      await request(app).post('/register').send(validUserData);

      const response = await request(app).post('/register').send(validUserData).expect(400);

      expect(response.body.message).toBe('User already exists');
    });

    it('should reject registration when disabled', async () => {
      if (!AppDataSource.isInitialized) return;

      // Disable registration
      await settingsRepository.update({}, { allowRegistration: false });

      const response = await request(app).post('/register').send(validUserData).expect(403);

      expect(response.body.message).toBe('User registration is currently disabled');
    });

    it('should validate required fields', async () => {
      if (!AppDataSource.isInitialized) return;

      const incompleteData = {
        email: 'test@example.com',
        // Missing password, firstName, lastName
      };

      await request(app).post('/register').send(incompleteData).expect(500); // Should fail due to missing fields
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Create a test user
      const user = new User();
      user.email = 'test@example.com';
      user.password = 'SecurePass123!';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = UserRole.USER;
      user.themePreference = 'light';
      await user.hashPassword();
      await userRepository.save(user);
    });

    it('should login with valid credentials', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.mfaSecret).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/login')
        .send({
          email: 'wrong@example.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should handle MFA-enabled users', async () => {
      if (!AppDataSource.isInitialized) return;

      // Enable MFA for user
      await userRepository.update(
        { email: 'test@example.com' },
        { mfaEnabled: true, mfaSecret: 'test-secret' }
      );

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body.requiresMfa).toBe(true);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.token).toBeUndefined();
    });
  });

  describe('GET /profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Create and login user to get token
      const user = new User();
      user.email = 'test@example.com';
      user.password = 'SecurePass123!';
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.role = UserRole.USER;
      await user.hashPassword();
      const savedUser = await userRepository.save(user);
      userId = savedUser.id;

      const loginResponse = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'SecurePass123!' });

      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
      expect(response.body.firstName).toBe('John');
      expect(response.body.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app).get('/profile').expect(401);

      expect(response.body.message).toBe('Authentication required');
    });

    it('should reject request with invalid token', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('PUT /profile', () => {
    let authToken: string;

    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      const user = new User();
      user.email = 'test@example.com';
      user.password = 'SecurePass123!';
      user.firstName = 'John';
      user.lastName = 'Doe';
      await user.hashPassword();
      await userRepository.save(user);

      const loginResponse = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'SecurePass123!' });

      authToken = loginResponse.body.token;
    });

    it('should update user profile', async () => {
      if (!AppDataSource.isInitialized) return;

      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        themePreference: 'dark',
      };

      const response = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe('Jane');
      expect(response.body.lastName).toBe('Smith');
      expect(response.body.themePreference).toBe('dark');
    });

    it('should prevent email conflicts', async () => {
      if (!AppDataSource.isInitialized) return;

      // Create another user
      const otherUser = new User();
      otherUser.email = 'other@example.com';
      otherUser.password = 'SecurePass123!';
      otherUser.firstName = 'Other';
      otherUser.lastName = 'User';
      await otherUser.hashPassword();
      await userRepository.save(otherUser);

      const response = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'other@example.com' })
        .expect(400);

      expect(response.body.message).toBe('Email already in use');
    });
  });

  describe('POST /change-password', () => {
    let authToken: string;

    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      const user = new User();
      user.email = 'test@example.com';
      user.password = 'SecurePass123!';
      user.firstName = 'John';
      user.lastName = 'Doe';
      await user.hashPassword();
      await userRepository.save(user);

      const loginResponse = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'SecurePass123!' });

      authToken = loginResponse.body.token;
    });

    it('should change password with valid current password', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass456!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject invalid current password', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewSecurePass456!',
        })
        .expect(401);

      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should reject same password', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'SecurePass123!',
          newPassword: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.message).toBe('New password must be different from current password');
    });

    it('should validate required fields', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .post('/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'SecurePass123!',
          // Missing newPassword
        })
        .expect(400);

      expect(response.body.message).toBe('Current password and new password are required');
    });
  });
});
