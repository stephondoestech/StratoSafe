import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);
const copyFile = promisify(fs.copyFile);
const access = promisify(fs.access);

/**
 * Service to handle external storage operations
 */
export class ExternalStorageService {
  private basePath: string;
  private storageEnabled: boolean;

  constructor() {
    // Get the external storage path from environment variable or use default
    this.basePath = process.env.EXTERNAL_STORAGE_PATH || '/mnt/external';
    this.storageEnabled = process.env.USE_EXTERNAL_STORAGE === 'true';
    this.initialize();
  }

  /**
   * Initialize storage service by ensuring the base directory exists
   */
  private async initialize(): Promise<void> {
    if (!this.storageEnabled) {
      console.log('External storage is not enabled. Set USE_EXTERNAL_STORAGE=true to enable it.');
      return;
    }

    try {
      // Check if the base directory exists, if not, create it
      try {
        await access(this.basePath, fs.constants.F_OK);
      } catch (error) {
        console.log(`Creating base directory: ${this.basePath}`);
        await mkdir(this.basePath, { recursive: true });
      }

      // Verify each storage location (storage1, storage2, etc.)
      const storages = ['storage1', 'storage2']; // Add more as needed
      for (const storage of storages) {
        const storagePath = path.join(this.basePath, storage);
        try {
          await access(storagePath, fs.constants.F_OK);
          console.log(`External storage '${storage}' is accessible.`);
        } catch (error) {
          console.error(`External storage '${storage}' is not accessible!`, error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize external storage:', error);
    }
  }

  /**
   * Get a list of available storage locations
   */
  async getStorageLocations(): Promise<string[]> {
    if (!this.storageEnabled) {
      return [];
    }

    try {
      const directories = await readdir(this.basePath, { withFileTypes: true });
      return directories
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch (error) {
      console.error('Error getting storage locations:', error);
      return [];
    }
  }

  /**
   * Checks if external storage is enabled
   */
  isEnabled(): boolean {
    return this.storageEnabled;
  }

  /**
   * List files in a specific storage location
   * @param storageLocation Storage location name (e.g., 'storage1')
   * @param subPath Optional sub-path within the storage location
   */
  async listFiles(storageLocation: string, subPath: string = ''): Promise<any[]> {
    if (!this.storageEnabled) {
      return [];
    }

    const dirPath = path.join(this.basePath, storageLocation, subPath);
    
    try {
      // Check if directory exists
      await access(dirPath, fs.constants.F_OK);
      
      const items = await readdir(dirPath, { withFileTypes: true });
      
      // Map each item to its details
      const itemDetails = await Promise.all(
        items.map(async (item) => {
          const fullPath = path.join(dirPath, item.name);
          const stats = await stat(fullPath);
          
          return {
            name: item.name,
            path: path.join(subPath, item.name),
            size: stats.size,
            isDirectory: item.isDirectory(),
            isFile: item.isFile(),
            modified: stats.mtime,
            created: stats.birthtime
          };
        })
      );
      
      return itemDetails;
    } catch (error) {
      console.error(`Error listing files in ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Save a file to a specific storage location
   * @param storageLocation Storage location name (e.g., 'storage1')
   * @param filePath Path where the file should be saved
   * @param fileBuffer File data as buffer
   */
  async saveFile(storageLocation: string, filePath: string, fileBuffer: Buffer): Promise<string | null> {
    if (!this.storageEnabled) {
      throw new Error('External storage is not enabled');
    }

    const fullPath = path.join(this.basePath, storageLocation, filePath);
    const directory = path.dirname(fullPath);
    
    try {
      // Ensure directory exists
      await mkdir(directory, { recursive: true });
      
      // Write the file
      await writeFile(fullPath, fileBuffer);
      
      return fullPath;
    } catch (error) {
      console.error(`Error saving file to ${fullPath}:`, error);
      return null;
    }
  }

  /**
   * Read a file from a specific storage location
   * @param storageLocation Storage location name (e.g., 'storage1')
   * @param filePath Path of the file to read
   */
  async readFile(storageLocation: string, filePath: string): Promise<Buffer | null> {
    if (!this.storageEnabled) {
      throw new Error('External storage is not enabled');
    }

    const fullPath = path.join(this.basePath, storageLocation, filePath);
    
    try {
      // Check if file exists
      await access(fullPath, fs.constants.F_OK);
      
      // Read the file
      return await readFile(fullPath);
    } catch (error) {
      console.error(`Error reading file from ${fullPath}:`, error);
      return null;
    }
  }

  /**
   * Delete a file from a specific storage location
   * @param storageLocation Storage location name (e.g., 'storage1')
   * @param filePath Path of the file to delete
   */
  async deleteFile(storageLocation: string, filePath: string): Promise<boolean> {
    if (!this.storageEnabled) {
      throw new Error('External storage is not enabled');
    }

    const fullPath = path.join(this.basePath, storageLocation, filePath);
    
    try {
      // Check if file exists
      await access(fullPath, fs.constants.F_OK);
      
      // Delete the file
      await unlink(fullPath);
      
      return true;
    } catch (error) {
      console.error(`Error deleting file from ${fullPath}:`, error);
      return false;
    }
  }

  /**
   * Create a directory in a specific storage location
   * @param storageLocation Storage location name (e.g., 'storage1')
   * @param dirPath Path of the directory to create
   */
  async createDirectory(storageLocation: string, dirPath: string): Promise<boolean> {
    if (!this.storageEnabled) {
      throw new Error('External storage is not enabled');
    }

    const fullPath = path.join(this.basePath, storageLocation, dirPath);
    
    try {
      await mkdir(fullPath, { recursive: true });
      return true;
    } catch (error) {
      console.error(`Error creating directory at ${fullPath}:`, error);
      return false;
    }
  }

  /**
   * Move a file or directory within or between storage locations
   * @param sourceStorage Source storage location
   * @param sourcePath Source path
   * @param destStorage Destination storage location
   * @param destPath Destination path
   */
  async moveItem(sourceStorage: string, sourcePath: string, destStorage: string, destPath: string): Promise<boolean> {
    if (!this.storageEnabled) {
      throw new Error('External storage is not enabled');
    }

    const sourceFull = path.join(this.basePath, sourceStorage, sourcePath);
    const destFull = path.join(this.basePath, destStorage, destPath);
    
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destFull);
      await mkdir(destDir, { recursive: true });
      
      // Move the file/directory
      await rename(sourceFull, destFull);
      
      return true;
    } catch (error) {
      console.error(`Error moving item from ${sourceFull} to ${destFull}:`, error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   * @param storageLocation Storage location name
   */
  async getStorageStats(storageLocation: string): Promise<any> {
    if (!this.storageEnabled) {
      throw new Error('External storage is not enabled');
    }

    const storagePath = path.join(this.basePath, storageLocation);
    
    try {
      const stats = await stat(storagePath);
      
      // Note: More detailed disk usage would require additional tools or libraries
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      console.error(`Error getting stats for ${storagePath}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const externalStorageService = new ExternalStorageService();
