import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Breadcrumbs,
  Link,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  CloudUpload as UploadIcon,
  CreateNewFolder as NewFolderIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  MoreVert as MoreIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Define interfaces for our data structures
interface StorageLocation {
  name: string;
}

interface FileItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  modified: string;
  created: string;
}

// Create a service for external storage API calls
const externalStorageService = {
  getStorageLocations: async () => {
    const response = await axios.get('/api/external-storage/locations');
    return response.data.locations;
  },
  
  listFiles: async (storageLocation: string, subPath: string = '') => {
    const response = await axios.get(`/api/external-storage/${storageLocation}/files`, {
      params: { path: subPath }
    });
    return response.data.files;
  },
  
  uploadFile: async (storageLocation: string, file: File, subPath: string = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', subPath);
    
    const response = await axios.post(`/api/external-storage/${storageLocation}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  downloadFile: async (storageLocation: string, filePath: string) => {
    const response = await axios.get(`/api/external-storage/${storageLocation}/download`, {
      params: { path: filePath },
      responseType: 'blob',
    });
    return response.data;
  },
  
  deleteFile: async (storageLocation: string, filePath: string) => {
    const response = await axios.delete(`/api/external-storage/${storageLocation}/files`, {
      params: { path: filePath }
    });
    return response.data;
  },
  
  createDirectory: async (storageLocation: string, dirPath: string) => {
    const response = await axios.post(`/api/external-storage/${storageLocation}/directories`, {
      path: dirPath
    });
    return response.data;
  },
  
  moveItem: async (sourceStorage: string, sourcePath: string, destStorage: string, destPath: string) => {
    const response = await axios.post(`/api/external-storage/move`, {
      sourceStorage,
      sourcePath,
      destStorage,
      destPath
    });
    return response.data;
  },
  
  getStorageStats: async (storageLocation: string) => {
    const response = await axios.get(`/api/external-storage/${storageLocation}/stats`);
    return response.data.stats;
  }
};

const ExternalStorageManager: React.FC = () => {
  // State variables
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileMenuAnchorEl, setFileMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  const { isAuthenticated } = useAuth();
  
  // Load storage locations on component mount
  useEffect(() => {
    const loadStorageLocations = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        const locations = await externalStorageService.getStorageLocations();
        setStorageLocations(locations.map((name: string) => ({ name })));
        
        // Select the first location if available
        if (locations.length > 0 && !selectedStorage) {
          setSelectedStorage(locations[0]);
        }
      } catch (err) {
        setError('Failed to load storage locations. Please check if external storage is enabled.');
        console.error('Error loading storage locations:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStorageLocations();
  }, [isAuthenticated]);
  
  // Load files when storage location or path changes
  useEffect(() => {
    const loadFiles = async () => {
      if (!isAuthenticated || !selectedStorage) return;
      
      try {
        setLoading(true);
        const filesList = await externalStorageService.listFiles(selectedStorage, currentPath);
        setFiles(filesList);
        setError(null);
      } catch (err) {
        setError('Failed to load files. Please check your connection and permissions.');
        console.error('Error loading files:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadFiles();
  }, [isAuthenticated, selectedStorage, currentPath, refreshTrigger]);
  
  // Handle storage location selection
  const handleStorageChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedStorage(newValue);
    setCurrentPath('');
  };
  
  // Handle directory navigation
  const handleNavigate = (dirPath: string) => {
    setCurrentPath(dirPath);
  };
  
  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (pathPart: string, index: number) => {
    // Reconstruct the path up to the clicked breadcrumb
    const pathParts = currentPath.split('/').filter(Boolean);
    const newPath = pathParts.slice(0, index + 1).join('/');
    setCurrentPath(newPath);
  };
  
  // Show file/folder context menu
  const handleFileMenu = (event: React.MouseEvent<HTMLElement>, file: FileItem) => {
    setSelectedFile(file);
    setFileMenuAnchorEl(event.currentTarget);
  };
  
  // Close file/folder context menu
  const handleCloseFileMenu = () => {
    setFileMenuAnchorEl(null);
  };
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    try {
      setLoading(true);
      const file = event.target.files[0];
      await externalStorageService.uploadFile(selectedStorage, file, currentPath);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
      setUploadDialogOpen(false);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Error uploading file:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle file download
  const handleDownload = async (file: FileItem) => {
    try {
      setLoading(true);
      const filePath = `${currentPath}/${file.name}`.replace(/^\/+/, '');
      const blob = await externalStorageService.downloadFile(selectedStorage, filePath);
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download file. Please try again.');
      console.error('Error downloading file:', err);
    } finally {
      setLoading(false);
      handleCloseFileMenu();
    }
  };
  
  // Handle file/folder deletion
  const handleDelete = async (file: FileItem) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) return;
    
    try {
      setLoading(true);
      const filePath = `${currentPath}/${file.name}`.replace(/^\/+/, '');
      await externalStorageService.deleteFile(selectedStorage, filePath);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
    } catch (err) {
      setError('Failed to delete item. Please try again.');
      console.error('Error deleting item:', err);
    } finally {
      setLoading(false);
      handleCloseFileMenu();
    }
  };
  
  // Handle new folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setLoading(true);
      const folderPath = `${currentPath}/${newFolderName}`.replace(/^\/+/, '');
      await externalStorageService.createDirectory(selectedStorage, folderPath);
      setNewFolderName('');
      setNewFolderDialogOpen(false);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
    } catch (err) {
      setError('Failed to create folder. Please try again.');
      console.error('Error creating folder:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Render breadcrumb navigation
  const renderBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    
    return (
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        <Link 
          color="inherit" 
          onClick={() => setCurrentPath('')} 
          sx={{ cursor: 'pointer' }}
        >
          {selectedStorage || 'Home'}
        </Link>
        
        {pathParts.map((part, index) => (
          <Link
            key={index}
            color={index === pathParts.length - 1 ? 'textPrimary' : 'inherit'}
            onClick={() => handleBreadcrumbClick(part, index)}
            sx={{ cursor: 'pointer' }}
          >
            {part}
          </Link>
        ))}
      </Breadcrumbs>
    );
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Main render function
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        External Storage Manager
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        {loading && storageLocations.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : storageLocations.length === 0 ? (
          <Alert severity="info">
            No external storage locations found. Please check your server configuration.
          </Alert>
        ) : (
          <>
            {/* Storage location tabs */}
            <Tabs
              value={selectedStorage}
              onChange={handleStorageChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 3 }}
            >
              {storageLocations.map((location) => (
                <Tab 
                  key={location.name} 
                  label={location.name} 
                  value={location.name} 
                />
              ))}
            </Tabs>
            
            {/* Breadcrumb navigation */}
            {renderBreadcrumbs()}
            
            {/* Action buttons */}
            <Box sx={{ display: 'flex', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{ mr: 1 }}
              >
                Upload
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<NewFolderIcon />}
                onClick={() => setNewFolderDialogOpen(true)}
              >
                New Folder
              </Button>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* File list */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : files.length === 0 ? (
              <Typography variant="body1" sx={{ py: 4, textAlign: 'center' }}>
                This folder is empty
              </Typography>
            ) : (
              <List>
                {files.map((file) => (
                  <ListItem
                    key={file.name}
                    button
                    onClick={file.isDirectory ? () => handleNavigate(`${currentPath}/${file.name}`.replace(/^\/+/, '')) : undefined}
                  >
                    <ListItemIcon>
                      {file.isDirectory ? <FolderIcon color="primary" /> : <FileIcon color="action" />}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={file.name}
                      secondary={file.isFile ? `${formatFileSize(file.size)} • Modified: ${new Date(file.modified).toLocaleString()}` : ''}
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="more"
                        onClick={(e) => handleFileMenu(e, file)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            
            {/* File context menu */}
            <Menu
              anchorEl={fileMenuAnchorEl}
              open={Boolean(fileMenuAnchorEl)}
              onClose={handleCloseFileMenu}
            >
              {selectedFile?.isFile && (
                <MenuItem onClick={() => selectedFile && handleDownload(selectedFile)}>
                  <ListItemIcon>
                    <DownloadIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Download" />
                </MenuItem>
              )}
              
              <MenuItem onClick={() => selectedFile && handleDelete(selectedFile)}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText primary="Delete" />
              </MenuItem>
            </Menu>
            
            {/* Upload dialog */}
            <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
              <DialogTitle>Upload File</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Select a file to upload to the current folder
                </DialogContentText>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{ marginTop: '16px' }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
              </DialogActions>
            </Dialog>
            
            {/* New folder dialog */}
            <Dialog open={newFolderDialogOpen} onClose={() => setNewFolderDialogOpen(false)}>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Enter a name for the new folder
                </DialogContentText>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Folder Name"
                  fullWidth
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setNewFolderDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFolder} color="primary">
                  Create
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ExternalStorageManager;
