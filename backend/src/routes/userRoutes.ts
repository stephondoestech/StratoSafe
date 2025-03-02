import { Router } from "express";
import { register, login, getUserProfile } from "../controllers/userController";
import { 
  generateMfaSetup, 
  verifyAndEnableMfa, 
  disableMfa, 
  getMfaStatus,
  generateBackupCodes,
  verifyMfaToken
} from "../controllers/mfaController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Auth routes
router.post("/register", register as any);
router.post("/login", login as any);
router.get("/profile", authMiddleware as any, getUserProfile as any);

// MFA routes
router.post("/verify-mfa", verifyMfaToken as any);
router.get("/mfa/setup", authMiddleware as any, generateMfaSetup as any);
router.post("/mfa/enable", authMiddleware as any, verifyAndEnableMfa as any);
router.post("/mfa/disable", authMiddleware as any, disableMfa as any);
router.get("/mfa/status", authMiddleware as any, getMfaStatus as any);
router.post("/mfa/backup-codes", authMiddleware as any, generateBackupCodes as any);

export default router;
