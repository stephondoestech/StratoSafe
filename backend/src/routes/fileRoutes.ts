import { Router } from 'express';
import { uploadFile, getUserFiles, downloadFile, deleteFile } from '../controllers/fileController';
import { authMiddleware } from '../middlewares/authMiddleware';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config/environment';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const originalName = path.basename(file.originalname);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.UPLOAD_MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!config.UPLOAD_ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

const router = Router();

// Type cast the middleware to avoid TypeScript errors
router.post('/upload', authMiddleware as any, upload.single('file') as any, uploadFile as any);

router.get('/', authMiddleware as any, getUserFiles as any);
router.get('/download/:id', authMiddleware as any, downloadFile as any);
router.delete('/:id', authMiddleware as any, deleteFile as any);

export default router;
