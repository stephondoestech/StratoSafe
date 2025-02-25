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

export default api;
