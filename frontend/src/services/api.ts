import axios from 'axios';
import { 
  FileMetadata, 
  PaginatedResponse, 
  FilePaginationParams, 
  FileUploadResponse,
  FileDeleteResponse,
  FileStats
} from '../types/file.interfaces';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth services
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  },
  
  register: async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await api.post('/users/register', userData);
    return response.data;
  },
  
  getUserProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  getAllUsers: async () => {
    const response = await api.get('/users/users');
    return response.data;
  },
  updateUserRole: async (userId: string, role: string) => {
    const response = await api.put('/users/user-role', { userId, role });
    return response.data;
  },
  
  // MFA Verification after login
  verifyMfa: async (email: string, token: string, isBackupCode: boolean = false) => {
    const response = await api.post('/users/verify-mfa', { email, token, isBackupCode });
    return response.data;
  },
  
  // Get MFA setup data (secret and QR code)
  setupMfa: async () => {
    const response = await api.get('/users/mfa/setup');
    return response.data;
  },
  
  // Enable MFA after setup
  enableMfa: async (token: string) => {
    const response = await api.post('/users/mfa/enable', { token });
    return response.data;
  },
  
  // Disable MFA
  disableMfa: async () => {
    const response = await api.post('/users/mfa/disable');
    return response.data;
  },
  
  // Get MFA status
  getMfaStatus: async () => {
    const response = await api.get('/users/mfa/status');
    return response.data;
  },
  
  // Generate backup codes
  generateBackupCodes: async () => {
    const response = await api.post('/users/mfa/backup-codes');
    return response.data;
  },
  
  // Update user profile information (including theme preference)
  updateUserProfile: async (userData: { firstName?: string; lastName?: string; email?: string; themePreference?: string }) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },
  
  // Update only theme preference
  updateThemePreference: async (themePreference: string) => {
    const response = await api.put('/users/theme-preference', { themePreference });
    return response.data;
  },
  
  // New password change endpoint
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/users/change-password', { currentPassword, newPassword });
    return response.data;
  },
  
  // Get system settings
  getSystemSettings: async () => {
    // Add cache-busting query parameter to prevent caching
    const timestamp = new Date().getTime();
    const response = await api.get(`/users/system-settings?t=${timestamp}`);
    return response.data;
  },
  
  // Update system settings
  updateSystemSettings: async (settings: { allowRegistration?: boolean }) => {
    const response = await api.put('/users/system-settings', settings);
    return response.data;
  },
};

// File services
export const fileService = {
  // Upload a file with optional description
  uploadFile: async (file: File, description?: string): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    const response = await api.post<FileUploadResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  // Get files with pagination and sorting
  getUserFiles: async (params: FilePaginationParams = {}): Promise<PaginatedResponse<FileMetadata>> => {
    const { page = 0, limit = 10, sortBy = 'uploadedAt', order = 'desc', search = '' } = params;
    
    const response = await api.get<PaginatedResponse<FileMetadata>>('/files', {
      params: { page, limit, sortBy, order, search }
    });
    
    return response.data;
  },
  
  // Get details for a specific file
  getFileDetails: async (fileId: string): Promise<FileMetadata> => {
    const response = await api.get<FileMetadata>(`/files/${fileId}`);
    return response.data;
  },
  
  // Download a file by ID
  downloadFile: async (fileId: string): Promise<Blob> => {
    const response = await api.get(`/files/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  // Delete a file by ID
  deleteFile: async (fileId: string): Promise<FileDeleteResponse> => {
    const response = await api.delete<FileDeleteResponse>(`/files/${fileId}`);
    return response.data;
  },
  
  // Get file statistics (admin only)
  getFileStats: async (): Promise<FileStats> => {
    const response = await api.get<FileStats>('/files/stats');
    return response.data;
  },
};

export default api;
