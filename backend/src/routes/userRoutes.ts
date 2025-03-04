import { Router } from "express";
import rateLimit from "express-rate-limit";
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

// Rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Auth routes
router.post("/register", register as any);
router.post("/login", login as any);
router.get("/profile", authMiddleware as any, getUserProfile as any);

// MFA routes
router.post("/verify-mfa", limiter, verifyMfaToken as any);
router.get("/mfa/setup", limiter, authMiddleware as any, generateMfaSetup as any);
router.post("/mfa/enable", limiter, authMiddleware as any, verifyAndEnableMfa as any);
router.post("/mfa/disable", limiter, authMiddleware as any, disableMfa as any);
router.get("/mfa/status", limiter, authMiddleware as any, getMfaStatus as any);
router.post("/mfa/backup-codes", limiter, authMiddleware as any, generateBackupCodes as any);

export default router;
