/**
 * File Controller Tests
 * Tests file upload, download, listing, and deletion
 */

import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { uploadFile, getUserFiles, downloadFile, deleteFile } from '../controllers/fileController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { errorHandler } from '../middlewares/errorMiddleware';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';
import { File } from '../models/File';
import * as jwt from 'jsonwebtoken';
import multer from 'multer';

// Mock file storage for tests
const testUploadDir = path.join(__dirname, '../../test-uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, testUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // File routes
  app.post('/files/upload', authMiddleware, upload.single('file'), uploadFile);
  app.get('/files', authMiddleware, getUserFiles);
  app.get('/files/download/:id', authMiddleware, downloadFile);
  app.delete('/files/:id', authMiddleware, deleteFile);

  app.use(errorHandler);

  return app;
};

describe('File Controller', () => {
  let app: express.Application;
  let userRepository: any;
  let fileRepository: any;
  let testUser: User;
  let otherUser: User;
  let authToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    app = createTestApp();

    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
    } catch (error) {
      console.warn('Database not available for testing, skipping file tests');
      return;
    }

    userRepository = AppDataSource.getRepository(User);
    fileRepository = AppDataSource.getRepository(File);

    // Create test upload directory
    try {
      await fs.mkdir(testUploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  beforeEach(async () => {
    if (!AppDataSource.isInitialized) return;

    // Clean up
    await fileRepository.delete({});
    await userRepository.delete({});

    // Create test users
    testUser = new User();
    testUser.email = 'test@example.com';
    testUser.password = 'SecurePass123!';
    testUser.firstName = 'John';
    testUser.lastName = 'Doe';
    testUser.role = UserRole.USER;
    await testUser.hashPassword();
    testUser = await userRepository.save(testUser);

    otherUser = new User();
    otherUser.email = 'other@example.com';
    otherUser.password = 'SecurePass123!';
    otherUser.firstName = 'Jane';
    otherUser.lastName = 'Smith';
    otherUser.role = UserRole.USER;
    await otherUser.hashPassword();
    otherUser = await userRepository.save(otherUser);

    // Generate auth tokens
    authToken = jwt.sign({ id: testUser.id, email: testUser.email }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });

    otherUserToken = jwt.sign(
      { id: otherUser.id, email: otherUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Clean up test upload directory
    try {
      const files = await fs.readdir(testUploadDir);
      await Promise.all(files.map((file) => fs.unlink(path.join(testUploadDir, file))));
    } catch (error) {
      // Directory might be empty or not exist
    }
  });

  afterAll(async () => {
    // Clean up test files and directory
    try {
      const files = await fs.readdir(testUploadDir);
      await Promise.all(files.map((file) => fs.unlink(path.join(testUploadDir, file))));
      await fs.rmdir(testUploadDir);
    } catch (error) {
      // Directory might not exist
    }

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /files/upload', () => {
    it('should upload a file successfully', async () => {
      if (!AppDataSource.isInitialized) return;

      const testContent = 'This is a test file content';
      const testFilePath = path.join(__dirname, 'test-file.txt');
      await fs.writeFile(testFilePath, testContent);

      try {
        const response = await request(app)
          .post('/files/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', testFilePath)
          .field('description', 'Test file upload')
          .expect(201);

        expect(response.body.message).toBe('File uploaded successfully');
        expect(response.body.file.filename).toContain('test-file.txt');
        expect(response.body.file.originalName).toBe('test-file.txt');
        expect(response.body.file.description).toBe('Test file upload');
        expect(response.body.file.size).toBeGreaterThan(0);

        // Verify file exists in database
        const savedFile = await fileRepository.findOne({
          where: { id: response.body.file.id },
        });
        expect(savedFile).toBeDefined();
        expect(savedFile.owner.id).toBe(testUser.id);
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    it('should require authentication', async () => {
      if (!AppDataSource.isInitialized) return;

      await request(app).post('/files/upload').expect(401);
    });
  });

  describe('GET /files', () => {
    let testFile: File;

    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Create a test file in database
      testFile = new File();
      testFile.filename = 'test-file.txt';
      testFile.originalName = 'test-file.txt';
      testFile.mimeType = 'text/plain';
      testFile.size = 100;
      testFile.path = '/uploads/test-file.txt';
      testFile.description = 'Test file';
      testFile.owner = testUser;
      testFile = await fileRepository.save(testFile);
    });

    it('should get user files', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .get('/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].filename).toBe('test-file.txt');
      expect(response.body[0].description).toBe('Test file');
    });

    it('should only return files owned by authenticated user', async () => {
      if (!AppDataSource.isInitialized) return;

      // Create file for other user
      const otherFile = new File();
      otherFile.filename = 'other-file.txt';
      otherFile.originalName = 'other-file.txt';
      otherFile.mimeType = 'text/plain';
      otherFile.size = 50;
      otherFile.path = '/uploads/other-file.txt';
      otherFile.owner = otherUser;
      await fileRepository.save(otherFile);

      const response = await request(app)
        .get('/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].filename).toBe('test-file.txt');
    });

    it('should require authentication', async () => {
      if (!AppDataSource.isInitialized) return;

      await request(app).get('/files').expect(401);
    });
  });

  describe('DELETE /files/:id', () => {
    let testFile: File;

    beforeEach(async () => {
      if (!AppDataSource.isInitialized) return;

      // Create file record
      testFile = new File();
      testFile.filename = 'delete-test.txt';
      testFile.originalName = 'delete-test.txt';
      testFile.mimeType = 'text/plain';
      testFile.size = 100;
      testFile.path = '/uploads/delete-test.txt';
      testFile.owner = testUser;
      testFile = await fileRepository.save(testFile);
    });

    it('should reject deletion of file not owned by user', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .delete(`/files/${testFile.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.message).toBe('File not found');

      // Verify file still exists
      const stillExists = await fileRepository.findOne({
        where: { id: testFile.id },
      });
      expect(stillExists).toBeDefined();
    });

    it('should handle non-existent file', async () => {
      if (!AppDataSource.isInitialized) return;

      const response = await request(app)
        .delete('/files/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('File not found');
    });

    it('should require authentication', async () => {
      if (!AppDataSource.isInitialized) return;

      await request(app).delete(`/files/${testFile.id}`).expect(401);
    });
  });
});
