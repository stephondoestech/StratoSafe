import axios from 'axios';

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
  uploadFile: async (file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getUserFiles: async () => {
    const response = await api.get('/files');
    return response.data;
  },
  
  downloadFile: async (fileId: string) => {
    const response = await api.get(`/files/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  deleteFile: async (fileId: string) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },
};

// External Storage services (new)
export const externalStorageService = {
  // Get available storage locations
  getStorageLocations: async () => {
    const response = await api.get('/external-storage/locations');
    return response.data.locations;
  },
  
  // List files in a specific storage location
  listFiles: async (storageLocation: string, path: string = '') => {
    const response = await api.get(`/external-storage/${storageLocation}/files`, {
      params: { path }
    });
    return response.data.files;
  },
  
  // Upload a file to external storage
  uploadFile: async (storageLocation: string, file: File, path: string = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    
    const response = await api.post(`/external-storage/${storageLocation}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Download a file from external storage
  downloadFile: async (storageLocation: string, filePath: string) => {
    const response = await api.get(`/external-storage/${storageLocation}/download`, {
      params: { path: filePath },
      responseType: 'blob',
    });
    return response.data;
  },
  
  // Delete a file from external storage
  deleteFile: async (storageLocation: string, filePath: string) => {
    const response = await api.delete(`/external-storage/${storageLocation}/files`, {
      params: { path: filePath }
    });
    return response.data;
  },
  
  // Create a directory in external storage
  createDirectory: async (storageLocation: string, dirPath: string) => {
    const response = await api.post(`/external-storage/${storageLocation}/directories`, {
      path: dirPath
    });
    return response.data;
  },
  
  // Move a file or directory
  moveItem: async (sourceStorage: string, sourcePath: string, destStorage: string, destPath: string) => {
    const response = await api.post('/external-storage/move', {
      sourceStorage,
      sourcePath,
      destStorage,
      destPath
    });
    return response.data;
  },
  
  // Get storage statistics
  getStorageStats: async (storageLocation: string) => {
    const response = await api.get(`/external-storage/${storageLocation}/stats`);
    return response.data.stats;
  },
  
  // Check if external storage is enabled
  checkStatus: async () => {
    try {
      const response = await api.get('/health');
      return {
        enabled: response.data.externalStorage === 'enabled',
        status: response.data.status,
      };
    } catch (error) {
      console.error('Error checking external storage status:', error);
      return { enabled: false, status: 'error' };
    }
  }
};

export default api;
