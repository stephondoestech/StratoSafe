import { Router } from "express";
import { register, login, getUserProfile } from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register as any);
router.post("/login", login as any);
router.get("/profile", authMiddleware as any, getUserProfile as any);

export default router;
