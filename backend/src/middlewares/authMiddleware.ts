import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";

dotenv.config();

// User repository to fetch user data including role
const userRepository = AppDataSource.getRepository(User);

// Extend Express Request type to include user with role
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role?: string };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    
    const token = authHeader.split(" ")[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey123") as { id: string; email: string };
    
    // Set basic user info from token
    req.user = {
      id: decoded.id,
      email: decoded.email
    };
    
    // Fetch user from database to get role
    const user = await userRepository.findOne({ where: { id: decoded.id } });
    
    if (user) {
      // Add role to user object in request
      req.user.role = user.role;
    }
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};
