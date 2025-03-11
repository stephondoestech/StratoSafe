import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";
import { 
  getAllStorageConfigs,
  createStorageConfig,
  updateStorageConfig,
  deleteStorageConfig,
  getAvailableStoragePaths,
  updateExternalStorageSettings,
  updateUserExternalStorageAccess
} from "../controllers/storageController";

const router = Router();


// User routes - require auth
router.get("/", authMiddleware as any, getAllStorageConfigs as any);
router.get("/available-paths", authMiddleware as any, getAvailableStoragePaths as any);
router.put("/user-access", authMiddleware as any, updateUserExternalStorageAccess as any);

// Admin routes - require admin
// PUT /settings/global must come BEFORE /:id to avoid being caught by the pattern route
router.put("/settings/global", authMiddleware as any, adminMiddleware as any, updateExternalStorageSettings as any);

// Generic pattern routes come last
router.post("/", authMiddleware as any, adminMiddleware as any, createStorageConfig as any);
router.put("/:id", authMiddleware as any, adminMiddleware as any, updateStorageConfig as any);
router.delete("/:id", authMiddleware as any, adminMiddleware as any, deleteStorageConfig as any);

export default router;
