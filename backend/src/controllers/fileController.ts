import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { File } from '../models/File';
import { User } from '../models/User';
import * as fs from 'fs';
import { config } from '../config/environment';

const fileRepository = AppDataSource.getRepository(File);
const userRepository = AppDataSource.getRepository(User);

// Upload file
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { description } = req.body;
    const userId = req.user?.id;

    // Get user
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
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
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all files for user
export const getUserFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const files = await fileRepository.find({
      where: { owner: { id: userId } },
      order: { uploadedAt: 'DESC' },
    });

    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Download file
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.id;

    // Find file
    const file = await fileRepository.findOne({
      where: { id: fileId, owner: { id: userId } },
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      res.status(404).json({ message: 'File not found on disk' });
      return;
    }

    if (!config.UPLOAD_ALLOWED_MIME.includes(file.mimeType)) {
      res.status(403).json({ message: 'File type is not allowed for download' });
      return;
    }

    // Send file with preserved content type
    res.type(file.mimeType);
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete file
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.id;

    // Find file
    const file = await fileRepository.findOne({
      where: { id: fileId, owner: { id: userId } },
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Delete from database
    await fileRepository.remove(file);

    // Delete from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
