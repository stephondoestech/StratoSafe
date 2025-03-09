import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../models/User";

const userRepository = AppDataSource.getRepository(User);

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // User ID is set by auth middleware
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    
    // Find the user and check their role
    const user = await userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Check if user is an admin
    if (user.role !== UserRole.ADMIN) {
      console.log(`Access denied: User ${user.email} (role: ${user.role}) attempted to access admin-only resource`);
      res.status(403).json({ message: "Access denied: Admin privileges required" });
      return;
    }
    
    // User is an admin, proceed to the next middleware
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
