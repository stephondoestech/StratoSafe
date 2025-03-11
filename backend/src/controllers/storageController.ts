import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ExternalStorage } from "../models/ExternalStorage";
import { User } from "../models/User";
import { SystemSettings } from "../models/SystemSettings";
import * as fs from "fs";
import * as path from "path";

const storageRepository = AppDataSource.getRepository(ExternalStorage);
const userRepository = AppDataSource.getRepository(User);
const systemSettingsRepository = AppDataSource.getRepository(SystemSettings);

// Get all external storage configurations
export const getAllStorageConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check system settings first
    const settings = await systemSettingsRepository.findOne({ where: { id: "global" } });
    
    if (!settings || !settings.allowExternalStorage) {
      res.status(403).json({ message: "External storage access is not enabled globally" });
      return;
    }
    
    // Check user-specific permission
    const userId = req.user?.id;
    const user = await userRepository.findOne({ where: { id: userId } });
    
    if (!user || !user.externalStorageAccess) {
      res.status(403).json({ message: "You don't have permission to access external storage" });
      return;
    }
    
    // Get all storage configurations
    const storageConfigs = await storageRepository.find({
      order: { createdAt: "DESC" }
    });
    
    res.json(storageConfigs);
  } catch (error) {
    console.error("Error fetching storage configurations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create a new storage configuration
export const createStorageConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, mountPath, displayName, description } = req.body;
    
    // Validate that this path actually exists
    if (!fs.existsSync(mountPath)) {
      res.status(400).json({ message: "The specified mount path does not exist" });
      return;
    }
    
    // Create a new storage config
    const storageConfig = new ExternalStorage();
    storageConfig.name = name;
    storageConfig.mountPath = mountPath;
    storageConfig.displayName = displayName;
    storageConfig.description = description;
    storageConfig.isActive = true;
    
    // Save to database
    await storageRepository.save(storageConfig);
    
    res.status(201).json(storageConfig);
  } catch (error) {
    console.error("Error creating storage configuration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update a storage configuration
export const updateStorageConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const storageId = req.params.id;
    const { name, displayName, description, isActive } = req.body;
    
    // Find the storage config
    const storageConfig = await storageRepository.findOne({
      where: { id: storageId }
    });
    
    if (!storageConfig) {
      res.status(404).json({ message: "Storage configuration not found" });
      return;
    }
    
    // Update fields
    if (name !== undefined) storageConfig.name = name;
    if (displayName !== undefined) storageConfig.displayName = displayName;
    if (description !== undefined) storageConfig.description = description;
    if (isActive !== undefined) storageConfig.isActive = isActive;
    
    // Save updated config
    await storageRepository.save(storageConfig);
    
    res.json(storageConfig);
  } catch (error) {
    console.error("Error updating storage configuration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a storage configuration
export const deleteStorageConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const storageId = req.params.id;
    
    // Find the storage config
    const storageConfig = await storageRepository.findOne({
      where: { id: storageId }
    });
    
    if (!storageConfig) {
      res.status(404).json({ message: "Storage configuration not found" });
      return;
    }
    
    // Delete from database
    await storageRepository.remove(storageConfig);
    
    res.json({ message: "Storage configuration deleted successfully" });
  } catch (error) {
    console.error("Error deleting storage configuration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Special function to detect available mount paths from environment
export const getAvailableStoragePaths = async (req: Request, res: Response): Promise<void> => {
  try {
    const basePath = '/mnt/external';
    let availablePaths: { path: string; exists: boolean }[] = [];
    
    // Check if the base path exists
    if (!fs.existsSync(basePath)) {
      res.json({ availablePaths: [] });
      return;
    }
    
    // Look for storage1, storage2, etc. directories
    for (let i = 1; i <= 10; i++) {
      const storagePath = path.join(basePath, `storage${i}`);
      const exists = fs.existsSync(storagePath);
      
      if (exists) {
        availablePaths.push({
          path: storagePath,
          exists: true
        });
      }
    }
    
    // Check environment variables for EXTERNAL_STORAGE_X
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('EXTERNAL_STORAGE_')) {
        const value = process.env[key];
        if (value) {
          const exists = fs.existsSync(value);
          availablePaths.push({
            path: value,
            exists
          });
        }
      }
    });
    
    res.json({ availablePaths });
  } catch (error) {
    console.error("Error detecting available storage paths:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update external storage settings
export const updateExternalStorageSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Received request to update external storage settings:", req.body);
    const { allowExternalStorage } = req.body;
    
    if (allowExternalStorage === undefined) {
      res.status(400).json({ message: "Missing required field: allowExternalStorage" });
      return;
    }
    
    // Get or create global settings
    let settings = await systemSettingsRepository.findOne({ where: { id: "global" } });
    
    if (!settings) {
      settings = new SystemSettings();
      settings.id = "global";
      settings.allowRegistration = true;
      settings.allowExternalStorage = false;
    }
    
    // Update external storage setting
    settings.allowExternalStorage = allowExternalStorage;
    
    // Save settings
    const savedSettings = await systemSettingsRepository.save(settings);
    console.log("Updated settings:", savedSettings);
    
    res.json({
      success: true,
      settings: savedSettings
    });
  } catch (error) {
    console.error("Error updating external storage settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update user external storage access
export const updateUserExternalStorageAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { externalStorageAccess } = req.body;
    
    // Find the user
    const user = await userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Update user's external storage access
    user.externalStorageAccess = externalStorageAccess;
    
    // Save the user
    await userRepository.save(user);
    
    // Return the updated user without sensitive information
    const { password: _, mfaSecret: __, mfaBackupCodes: ___, ...userWithoutSensitiveInfo } = user;
    res.json(userWithoutSensitiveInfo);
  } catch (error) {
    console.error("Error updating user external storage access:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
