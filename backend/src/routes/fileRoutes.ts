import { Router } from "express";
import { 
  uploadFile, 
  getUserFiles, 
  downloadFile, 
  deleteFile,
  getFileDetails 
} from "../controllers/fileController";
import { authMiddleware } from "../middlewares/authMiddleware";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a secure filename: timestamp-originalname
    const timestamp = Date.now();
    // Get a clean filename by removing special characters, spaces, etc.
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${timestamp}-${cleanFileName}`);
  }
});

// File size limit (10MB)
const FILE_SIZE_LIMIT = 10 * 1024 * 1024;

// File filter to restrict file types if needed
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept all file types for now
  // You can implement file type restrictions here if needed
  cb(null, true);
};

// Configure multer upload
const upload = multer({ 
  storage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter
});

const router = Router();

// Get all files with pagination and sorting
router.get(
  "/", 
  authMiddleware as any, 
  getUserFiles as any
);

// Get details for a specific file
router.get(
  "/:id", 
  authMiddleware as any, 
  getFileDetails as any
);

// Download a file
router.get(
  "/download/:id", 
  authMiddleware as any, 
  downloadFile as any
);

// Upload a new file
router.post(
  "/upload", 
  authMiddleware as any, 
  upload.single("file") as any, 
  uploadFile as any
);

// Delete a file
router.delete(
  "/:id", 
  authMiddleware as any, 
  deleteFile as any
);

export default router;
