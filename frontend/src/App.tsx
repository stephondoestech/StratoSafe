import React, { useState, useEffect } from 'react';
import axios, { AxiosProgressEvent } from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  TextField,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LogoutIcon from '@mui/icons-material/Logout';

const API_BASE = 'http://localhost:3000';

interface FileItem {
  _id: string;
  filename: string;
  originalName: string;
  uploadDate: string;
  owner: string;
}

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  // Handles login and registration
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/register' : '/login';
      const response = await axios.post(`${API_BASE}${endpoint}`, { username, password });
      if (!isRegistering) {
        const token = response.data.token;
        setToken(token);
        localStorage.setItem('token', token);
      } else {
        setIsRegistering(false);
        setError('Registration successful. Please log in.');
      }
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed.');
    }
  };

  // Upload file with progress
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      setError(null);
      setUploadProgress(0);
      fetchFiles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error uploading file.');
      setUploadProgress(0);
    }
  };

  // Fetch the list of files
  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(response.data.files);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error fetching files.');
    }
  };

  // Download a file by its ID
  const handleDownload = async (fileId: string, originalName: string) => {
    try {
      const response = await axios.get(`${API_BASE}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error downloading file.');
    }
  };

  // Preview file (for images)
  const handlePreview = async (fileId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/files/${fileId}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setPreviewImage(url);
      setPreviewOpen(true);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error fetching preview.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setFiles([]);
    setPreviewImage(null);
  };

  useEffect(() => {
    if (token) {
      fetchFiles();
    }
  }, [token]);

  // If not logged in, show authentication form
  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom align="center">
            {isRegistering ? 'Register for NimbusNest' : 'Login to NimbusNest'}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box
            component="form"
            onSubmit={handleAuth}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Username"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" color="primary">
              {isRegistering ? 'Register' : 'Login'}
            </Button>
          </Box>
          <Button onClick={() => setIsRegistering(!isRegistering)} sx={{ mt: 2 }} fullWidth>
            {isRegistering ? 'Switch to Login' : 'Switch to Register'}
          </Button>
        </Paper>
      </Container>
    );
  }

  // Main interface when logged in
  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            NimbusNest
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Upload to Your Nest
          </Typography>
          {uploadProgress > 0 && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 2 }} />}
          <Box
            component="form"
            onSubmit={handleUpload}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Button variant="contained" component="label">
              Choose File
              <input
                type="file"
                hidden
                onChange={(e) => {
                  if (e.target.files) setFile(e.target.files[0]);
                }}
                required
              />
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Upload
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Your Files in the Nest
          </Typography>
          <List>
            {files.map((file) => (
              <ListItem key={file._id} divider>
                <ListItemText
                  primary={file.originalName}
                  secondary={new Date(file.uploadDate).toLocaleString()}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleDownload(file._id, file.originalName)}>
                    <DownloadIcon />
                  </IconButton>
                  {/\.(jpg|jpeg|png|gif)$/i.test(file.originalName) && (
                    <IconButton edge="end" onClick={() => handlePreview(file._id)}>
                      <VisibilityIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>File Preview</DialogTitle>
        <DialogContent>
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              alt="Preview"
              sx={{ width: '100%' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default App;
