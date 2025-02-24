import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const userRepository = AppDataSource.getRepository(User);

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Create new user
    const user = new User();
    user.email = email;
    user.password = password;
    user.firstName = firstName;
    user.lastName = lastName;

    // Hash password before saving
    await user.hashPassword();

    // Save user to database
    await userRepository.save(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "supersecretkey123",
      { expiresIn: "1d" }
    );

    // Return user info and token
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // User ID is set by auth middleware
    const userId = req.user?.id;
    
    const user = await userRepository.findOne({ 
      where: { id: userId },
      relations: ["files"]
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
