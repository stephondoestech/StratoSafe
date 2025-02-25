import { Router } from "express";
import { uploadFile, getUserFiles, downloadFile, deleteFile } from "../controllers/fileController";
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
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const router = Router();

// Type cast the middleware to avoid TypeScript errors
router.post(
  "/upload", 
  authMiddleware as any, 
  upload.single("file") as any, 
  uploadFile as any
);

router.get("/", authMiddleware as any, getUserFiles as any);
router.get("/download/:id", authMiddleware as any, downloadFile as any);
router.delete("/:id", authMiddleware as any, deleteFile as any);

export default router;
