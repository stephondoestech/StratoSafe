import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { MfaService } from "../services/MfaService";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const userRepository = AppDataSource.getRepository(User);

// Generate MFA setup data (secret and QR code)
export const generateMfaSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Generate new secret
    const secret = MfaService.generateSecret(user.email);
    
    // Store the secret temporarily (not activated yet)
    user.mfaSecret = secret;
    await userRepository.save(user);
    
    // Generate TOTP URI for QR code
    const totpUri = MfaService.generateTotpUri(user.email, secret);
    
    // Generate QR code
    const qrCode = await MfaService.generateQrCode(totpUri);
    
    res.json({
      secret,
      qrCode,
      message: "Scan the QR code with your authenticator app, then verify with a token"
    });
  } catch (error) {
    console.error("Error generating MFA setup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify and enable MFA
export const verifyAndEnableMfa = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ message: "Token is required" });
      return;
    }
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Verify token and enable MFA
    const isValid = await MfaService.setupMfa(user, token);
    
    if (!isValid) {
      res.status(400).json({ message: "Invalid token" });
      return;
    }
    
    // Save the updated user with MFA enabled
    await userRepository.save(user);
    
    // Parse backup codes to return them to user
    const backupCodes = user.mfaBackupCodes 
      ? JSON.parse(user.mfaBackupCodes).map(() => "********") // Redact actual codes
      : [];
    
    res.json({
      success: true,
      message: "MFA enabled successfully",
      backupCodesCount: backupCodes.length
    });
  } catch (error) {
    console.error("Error enabling MFA:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Disable MFA
export const disableMfa = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Disable MFA
    MfaService.disableMfa(user);
    
    // Save the updated user
    await userRepository.save(user);
    
    res.json({
      success: true,
      message: "MFA disabled successfully"
    });
  } catch (error) {
    console.error("Error disabling MFA:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get MFA status
export const getMfaStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    res.json({
      mfaEnabled: user.mfaEnabled,
      hasBackupCodes: !!user.mfaBackupCodes
    });
  } catch (error) {
    console.error("Error getting MFA status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Generate new backup codes
export const generateBackupCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    if (!user.mfaEnabled) {
      res.status(400).json({ message: "MFA is not enabled" });
      return;
    }
    
    // Generate new backup codes
    const codes = await user.generateBackupCodes();
    
    // Save the user with new backup codes
    await userRepository.save(user);
    
    res.json({
      success: true,
      backupCodes: codes,
      message: "New backup codes generated successfully. Keep them in a safe place."
    });
  } catch (error) {
    console.error("Error generating backup codes:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify token when logging in
export const verifyMfaToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, token, isBackupCode } = req.body;
    
    // Find user by email
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    let isValid = false;
    
    if (isBackupCode) {
      // Verify backup code
      isValid = await user.verifyBackupCode(token);
      if (isValid) {
        // Save the user to update the backup codes list (removing the used one)
        await userRepository.save(user);
      }
    } else {
      // Verify TOTP token
      isValid = user.mfaSecret ? MfaService.verifyToken(token, user.mfaSecret) : false;
    }
    
    if (!isValid) {
      res.status(401).json({ message: isBackupCode ? "Invalid backup code" : "Invalid token" });
      return;
    }
    
    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is required');
      res.status(500).json({ message: 'Server configuration error' });
      return;
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    // Return user info and token
    const { password: _, mfaSecret: __, mfaBackupCodes: ___, ...userWithoutSensitiveInfo } = user;
    res.json({
      user: userWithoutSensitiveInfo,
      token: jwtToken
    });
  } catch (error) {
    console.error("Error verifying MFA token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
