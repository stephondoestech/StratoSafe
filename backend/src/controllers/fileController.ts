import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { File } from "../models/File";
import { User } from "../models/User";
import * as fs from "fs";
import * as path from "path";
import { 
  FileMetadata, 
  PaginatedResponse, 
  FileDeleteResponse,
  FileStats
} from '../types/file.interfaces';

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
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin';

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Parse sorting parameters
    const sortBy = (req.query.sortBy as string) || 'uploadedAt';
    const order = (req.query.order as string) || 'desc';
    
    // Parse search parameter
    const search = (req.query.search as string) || '';
    
    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['originalName', 'size', 'uploadedAt', 'updatedAt', 'description'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'uploadedAt';
    
    // Validate order direction
    const validOrder = order === 'asc' ? 'ASC' : 'DESC';
    
    // Build the query with pagination and sorting
    let queryBuilder = fileRepository.createQueryBuilder('file');
    
    // Join with owner to get the owner information
    queryBuilder = queryBuilder
      .leftJoinAndSelect('file.owner', 'owner');
    
    // If admin, can see all files, otherwise only user's own files
    if (!isAdmin) {
      queryBuilder = queryBuilder.where('owner.id = :userId', { userId });
    }
    
    // Add search condition if search term is provided
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(file.originalName ILIKE :search OR file.description ILIKE :search)', 
        { search: `%${search}%` }
      );
    }
    
    // Apply sorting
    queryBuilder = queryBuilder.orderBy(`file.${validSortBy}`, validOrder);
    
    // Apply pagination
    queryBuilder = queryBuilder
      .skip(page * limit)
      .take(limit);
    
    // Execute the query
    const [files, total] = await queryBuilder.getManyAndCount();
    
    // Process files to conditionally include the path
    const processedFiles = files.map(file => {
      // Create a copy of the file to avoid modifying the original
      const fileData: any = { ...file };
      
      // Only include path if user is admin or the file owner
      if (!isAdmin && fileData.owner.id !== userId) {
        delete fileData.path;
      }
      
      // Don't expose the entire owner object, just include ownerId
      if (fileData.owner) {
        fileData.ownerId = fileData.owner.id;
        delete fileData.owner;
      }
      
      return fileData;
    });

    // Prepare the paginated response
    const response: PaginatedResponse<FileMetadata> = {
      data: processedFiles as FileMetadata[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };

    // Return data with pagination metadata
    res.json(response);
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
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin';

    // Build query to find the file
    let queryBuilder = fileRepository.createQueryBuilder('file')
      .leftJoinAndSelect('file.owner', 'owner')
      .where('file.id = :fileId', { fileId });
    
    // If not admin, add owner check
    if (!isAdmin) {
      queryBuilder = queryBuilder.andWhere('owner.id = :userId', { userId });
    }
    
    const file = await queryBuilder.getOne();

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
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin';

    // Build query to find the file
    let queryBuilder = fileRepository.createQueryBuilder('file')
      .leftJoinAndSelect('file.owner', 'owner')
      .where('file.id = :fileId', { fileId });
    
    // If not admin, add owner check
    if (!isAdmin) {
      queryBuilder = queryBuilder.andWhere('owner.id = :userId', { userId });
    }
    
    const file = await queryBuilder.getOne();

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

    // Return success response
    const response: FileDeleteResponse = { message: "File deleted successfully" };
    res.json(response);
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
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin';

    // Create a query to find the file
    let queryBuilder = fileRepository.createQueryBuilder('file')
      .leftJoinAndSelect('file.owner', 'owner')
      .where('file.id = :fileId', { fileId });
    
    // If not admin, add owner check
    if (!isAdmin) {
      queryBuilder = queryBuilder.andWhere('owner.id = :userId', { userId });
    }
    
    const file = await queryBuilder.getOne();
    
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    
    // Process file to conditionally include the path
    const fileData: any = { ...file };
    
    // Only include path if user is admin or the file owner
    if (!isAdmin && fileData.owner.id !== userId) {
      delete fileData.path;
    }
    
    // Don't expose the entire owner object, just include ownerId
    if (fileData.owner) {
      fileData.ownerId = fileData.owner.id;
      // If admin, include owner details as well
      if (isAdmin) {
        fileData.ownerEmail = fileData.owner.email;
        fileData.ownerName = `${fileData.owner.firstName} ${fileData.owner.lastName}`;
      }
      delete fileData.owner;
    }

    res.json(fileData as FileMetadata);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get file statistics (admin only)
export const getFileStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    
    // Only allow admins to access this endpoint
    if (userRole !== 'admin') {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    
    // Get total count of files
    const totalFiles = await fileRepository.count();
    
    // Get total size of all files
    const totalSizeResult = await fileRepository.createQueryBuilder('file')
      .select('SUM(file.size)', 'totalSize')
      .getRawOne();
    
    const totalSize = totalSizeResult?.totalSize || 0;
    
    // Get file type distribution
    const fileTypeDistribution = await fileRepository.createQueryBuilder('file')
      .select("SUBSTRING(file.mimeType, 1, POSITION('/' in file.mimeType) - 1)", 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy("SUBSTRING(file.mimeType, 1, POSITION('/' in file.mimeType) - 1)")
      .getRawMany();
    
    // Get files per user count
    const filesPerUser = await fileRepository.createQueryBuilder('file')
      .leftJoin('file.owner', 'owner')
      .select('owner.id', 'userId')
      .addSelect('owner.email', 'userEmail')
      .addSelect('owner.firstName', 'firstName')
      .addSelect('owner.lastName', 'lastName')
      .addSelect('COUNT(*)', 'fileCount')
      .addSelect('SUM(file.size)', 'totalSize')
      .groupBy('owner.id')
      .addGroupBy('owner.email')
      .addGroupBy('owner.firstName')
      .addGroupBy('owner.lastName')
      .getRawMany();
    
    // Prepare and return the stats response
    const statsResponse: FileStats = {
      totalFiles,
      totalSize,
      formattedTotalSize: formatFileSize(totalSize),
      fileTypeDistribution,
      filesPerUser
    };
    
    res.json(statsResponse);
  } catch (error) {
    console.error("Error fetching file statistics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
