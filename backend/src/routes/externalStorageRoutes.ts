import { Router } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  getStorageLocations,
  listFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  createDirectory,
  moveItem,
  getStorageStats
} from "../controllers/externalStorageController";

// Ensure temp uploads directory exists
const tempUploadsDir = path.join(__dirname, "../../temp-uploads");
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadsDir);
  },
  filename: (req, file, cb) => {
    // Use a timestamp prefix to avoid name collisions
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const router = Router();

// All routes are protected by auth middleware
// Apply authMiddleware to all routes with type casting to satisfy TypeScript
router.use(authMiddleware as any);

// Get all available storage locations
router.get("/locations", getStorageLocations as any);

// List files in a specific storage location
router.get("/:storageLocation/files", listFiles as any);

// Upload a file to external storage
router.post(
  "/:storageLocation/upload",
  upload.single("file") as any,
  uploadFile as any
);

// Download a file from external storage
router.get("/:storageLocation/download", downloadFile as any);

// Delete a file from external storage
router.delete("/:storageLocation/files", deleteFile as any);

// Create a directory in external storage
router.post("/:storageLocation/directories", createDirectory as any);

// Move a file or directory
router.post("/move", moveItem as any);

// Get storage statistics
router.get("/:storageLocation/stats", getStorageStats as any);

export default router;
