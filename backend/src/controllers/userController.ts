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
    user.themePreference = 'light'; // Default to light theme

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

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // Return a partial authentication response indicating MFA is required
      res.json({
        requiresMfa: true,
        email: user.email,
        message: "MFA verification required"
      });
      return;
    }

    // If MFA is not enabled, generate JWT token and proceed with normal login
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "supersecretkey123",
      { expiresIn: "1d" }
    );

    // Return user info and token
    const { password: _, mfaSecret: __, mfaBackupCodes: ___, ...userWithoutSensitiveInfo } = user;
    res.json({
      user: userWithoutSensitiveInfo,
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
    
    // Return user without sensitive information
    const { password: _, mfaSecret: __, mfaBackupCodes: ___, ...userWithoutSensitiveInfo } = user;
    res.json(userWithoutSensitiveInfo);
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, email, themePreference } = req.body;

    // Find the user
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if email is being changed and verify it's not already taken
    if (email && email !== user.email) {
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({ message: "Email already in use" });
        return;
      }
      user.email = email;
    }

    // Update first and last name if provided
    if (firstName) {
      user.firstName = firstName;
    }
    
    if (lastName) {
      user.lastName = lastName;
    }

    // Update theme preference if provided
    if (themePreference && (themePreference === 'light' || themePreference === 'dark')) {
      user.themePreference = themePreference;
    }

    // Save the updated user
    await userRepository.save(user);

    // Return the updated user without sensitive information
    const { password: _, mfaSecret: __, mfaBackupCodes: ___, ...userWithoutSensitiveInfo } = user;
    res.json(userWithoutSensitiveInfo);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update only the theme preference
export const updateThemePreference = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { themePreference } = req.body;

    // Validate the theme preference
    if (!themePreference || (themePreference !== 'light' && themePreference !== 'dark')) {
      res.status(400).json({ message: "Invalid theme preference. Must be 'light' or 'dark'" });
      return;
    }

    // Find the user
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Update theme preference
    user.themePreference = themePreference;

    // Save the updated user
    await userRepository.save(user);

    res.json({ 
      success: true, 
      message: "Theme preference updated successfully",
      themePreference: user.themePreference
    });
  } catch (error) {
    console.error("Error updating theme preference:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// New change password functionality
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    // Validate request
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Current password and new password are required" });
      return;
    }

    // Find the user
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      res.status(400).json({ message: "New password must be different from current password" });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.hashPassword();
    await userRepository.save(user);

    res.json({ 
      success: true, 
      message: "Password changed successfully" 
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
