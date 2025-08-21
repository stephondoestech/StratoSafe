import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    
    const token = authHeader.split(" ")[1];
    
    // Verify token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is required');
      res.status(500).json({ message: 'Server configuration error' });
      return;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; email: string };
    
    // Set user in request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};
