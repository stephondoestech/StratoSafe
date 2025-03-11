import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { File } from "../models/File";
import { User } from "../models/User";
import * as fs from "fs";
import * as path from "path";

const fileRepository = AppDataSource.getRepository(File);
const userRepository = AppDataSource.getRepository(User);

// Upload file
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { description } = req.body;
    const userId = req.user?.id;

    // Get user
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Create new file record
    const file = new File();
    file.filename = req.file.filename;
    file.originalName = req.file.originalname;
    file.mimeType = req.file.mimetype;
    file.size = req.file.size;
    file.path = req.file.path;
    file.description = description;
    file.owner = user;

    // Save file to database
    await fileRepository.save(file);

    res.status(201).json(file);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all files for user with pagination and sorting
export const getUserFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Parse sorting parameters
    const sortBy = (req.query.sortBy as string) || 'uploadedAt';
    const order = (req.query.order as string) || 'desc';
    
    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['originalName', 'size', 'uploadedAt', 'updatedAt', 'description'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'uploadedAt';
    
    // Validate order direction
    const validOrder = order === 'asc' ? 'ASC' : 'DESC';
    
    // Build the query with pagination and sorting
    const [files, total] = await fileRepository.findAndCount({
      where: { owner: { id: userId } },
      order: { [validSortBy]: validOrder },
      skip: page * limit,
      take: limit,
    });

    // Return data with pagination metadata
    res.json({
      data: files,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Download file
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.id;

    // Find file
    const file = await fileRepository.findOne({
      where: { id: fileId, owner: { id: userId } }
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      res.status(404).json({ message: "File not found on disk" });
      return;
    }

    // Send file
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete file
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.id;

    // Find file
    const file = await fileRepository.findOne({
      where: { id: fileId, owner: { id: userId } }
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Delete from database
    await fileRepository.remove(file);

    // Delete from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get file details for a specific file
export const getFileDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.id;

    // Find file with owner check for security
    const file = await fileRepository.findOne({
      where: { id: fileId, owner: { id: userId } }
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    res.json(file);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
