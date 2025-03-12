/**
 * Interface for file metadata sent to the client
 * (path included only for owners/admins)
 */
export interface FileMetadata {
    id: string;
    filename: string;          // Server filename (internal)
    originalName: string;      // Original file name
    mimeType: string;          // File MIME type
    size: number;              // File size in bytes
    description?: string;      // Optional file description
    uploadedAt: Date;          // When the file was uploaded
    updatedAt: Date;           // When the file was last updated
    path?: string;             // Server file path (only included for owners/admins)
    ownerId: string;           // ID of the file owner
    ownerEmail?: string;       // Email of the file owner (only for admins)
    ownerName?: string;        // Name of the file owner (only for admins)
  }
  
  /**
   * Interface for pagination parameters in file listing requests
   */
  export interface FilePaginationParams {
    page?: number;             // Page number (0-based)
    limit?: number;            // Items per page
    sortBy?: SortableFileField; // Field to sort by
    order?: SortOrder;         // Sort direction
    search?: string;           // Search term for filtering
  }
  
  /**
   * Type for fields that can be sorted
   */
  export type SortableFileField = 'originalName' | 'size' | 'uploadedAt' | 'updatedAt' | 'description';
  
  /**
   * Type for sort direction
   */
  export type SortOrder = 'asc' | 'desc';
  
  /**
   * Interface for paginated response
   */
  export interface PaginatedResponse<T> {
    data: T[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
  
  /**
   * Interface for file upload response
   */
  export interface FileUploadResponse {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    description?: string;
    uploadedAt: Date;
    updatedAt: Date;
  }
  
  /**
   * Interface for file deletion response
   */
  export interface FileDeleteResponse {
    message: string;
  }
  
  /**
   * Interface for file statistics (admin only)
   */
  export interface FileStats {
    totalFiles: number;
    totalSize: number;
    formattedTotalSize: string;
    fileTypeDistribution: {
      type: string;
      count: number;
    }[];
    filesPerUser: {
      userId: string;
      userEmail: string;
      firstName: string;
      lastName: string;
      fileCount: number;
      totalSize: number;
    }[];
  }
