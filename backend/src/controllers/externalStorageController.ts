import { Request, Response } from "express";
import * as multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { externalStorageService } from "../services/ExternalStorageService";

/**
 * Get all available storage locations
 */
export const getStorageLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    const locations = await externalStorageService.getStorageLocations();
    res.json({ locations });
  } catch (error) {
    console.error("Error getting storage locations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * List files in a specific storage location
 */
export const listFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    const { storageLocation } = req.params;
    const subPath = req.query.path as string || '';
    
    const files = await externalStorageService.listFiles(storageLocation, subPath);
    res.json({ files });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Upload a file to external storage
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { storageLocation } = req.params;
    const subPath = req.body.path || '';
    
    // Construct the path where the file will be saved
    const filePath = path.join(subPath, req.file.originalname);
    
    // Read the file buffer
    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Save to external storage
    const savedPath = await externalStorageService.saveFile(storageLocation, filePath, fileBuffer);
    
    // Clean up the temporary file
    fs.unlinkSync(req.file.path);
    
    if (savedPath) {
      res.status(201).json({ 
        message: "File uploaded successfully", 
        path: filePath,
        name: req.file.originalname,
        size: req.file.size
      });
    } else {
      res.status(500).json({ message: "Failed to save file to external storage" });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Download a file from external storage
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    const { storageLocation } = req.params;
    const filePath = req.query.path as string;
    
    if (!filePath) {
      res.status(400).json({ message: "File path is required" });
      return;
    }
    
    const fileBuffer = await externalStorageService.readFile(storageLocation, filePath);
    
    if (!fileBuffer) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    
    // Get the filename from the path
    const fileName = path.basename(filePath);
    
    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send the file
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a file from external storage
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    const { storageLocation } = req.params;
    const filePath = req.query.path as string;
    
    if (!filePath) {
      res.status(400).json({ message: "File path is required" });
      return;
    }
    
    const success = await externalStorageService.deleteFile(storageLocation, filePath);
    
    if (success) {
      res.json({ message: "File deleted successfully" });
    } else {
      res.status(404).json({ message: "File not found or couldn't be deleted" });
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Create a directory in external storage
 */
export const createDirectory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    const { storageLocation } = req.params;
    const { path: dirPath } = req.body;
    
    if (!dirPath) {
      res.status(400).json({ message: "Directory path is required" });
      return;
    }
    
    const success = await externalStorageService.createDirectory(storageLocation, dirPath);
    
    if (success) {
      res.status(201).json({ message: "Directory created successfully" });
    } else {
      res.status(500).json({ message: "Failed to create directory" });
    }
  } catch (error) {
    console.error("Error creating directory:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Move a file or directory within or between storage locations
 */
export const moveItem = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    const { sourceStorage, sourcePath, destStorage, destPath } = req.body;
    
    if (!sourceStorage || !sourcePath || !destStorage || !destPath) {
      res.status(400).json({ message: "Source and destination information are required" });
      return;
    }
    
    const success = await externalStorageService.moveItem(sourceStorage, sourcePath, destStorage, destPath);
    
    if (success) {
      res.json({ message: "Item moved successfully" });
    } else {
      res.status(500).json({ message: "Failed to move item" });
    }
  } catch (error) {
    console.error("Error moving item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get storage statistics
 */
export const getStorageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!externalStorageService.isEnabled()) {
      res.status(403).json({ message: "External storage is not enabled" });
      return;
    }

    const { storageLocation } = req.params;
    
    const stats = await externalStorageService.getStorageStats(storageLocation);
    res.json({ stats });
  } catch (error) {
    console.error("Error getting storage stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
