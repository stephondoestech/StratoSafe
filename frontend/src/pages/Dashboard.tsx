import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Container, Paper, Divider } from '@mui/material';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import { fileService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  // Add debugging log
  console.log('Dashboard component rendering');
  
  // State to track when files have been updated
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // For debugging: to check if any files are loaded with paths
  const [debugFiles, setDebugFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get user info from auth context
  const { user } = useAuth();
  
  // Debug user role
  console.log('Current user:', user);
  console.log('Is admin?', user?.role === 'admin');

  // Callback for when files are uploaded or deleted
  const handleFilesUpdated = (message?: string) => {
    // Increment the trigger to cause FileList to refresh
    setFileRefreshTrigger(prev => prev + 1);
    
    // Show feedback message if provided
    if (message) {
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    }
    
    // Debug: fetch files directly to check for paths
    fetchDebugFiles();
  };
  
  // Debug function to directly check API response
  const fetchDebugFiles = async () => {
    try {
      setLoading(true);
      const response = await fileService.getUserFiles();
      console.log('DEBUG: Direct API response:', response);
      
      // Check if any files have path property
      const filesWithPaths = response.data.filter(file => file.path);
      console.log('DEBUG: Files with paths:', filesWithPaths);
      
      setDebugFiles(response.data);
    } catch (error) {
      console.error('Debug fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load debug data on component mount
  useEffect(() => {
    fetchDebugFiles();
  }, []);

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.firstName}!
        </Typography>
        <Typography variant="body1" gutterBottom>
          Manage your files securely in the cloud with StratoSafe.
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Quick Stats
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', py: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">Files</Typography>
            <Typography variant="body2" color="text.secondary">
              {debugFiles.length} files uploaded
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">Security</Typography>
            <Typography variant="body2" color="text.secondary">
              Role: {user?.role || 'user'}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">Debug</Typography>
            <Typography variant="body2" color="text.secondary">
              {debugFiles.filter(f => f.path).length} files with path property
            </Typography>
          </Box>
        </Box>
        
        {/* Debug info for admin users */}
        {user?.role === 'admin' && debugFiles.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2">Debug Info (Admin Only):</Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              First file path: {debugFiles[0]?.path || 'No path found'}
            </Typography>
          </Box>
        )}
      </Paper>

      <FileUpload onUploadSuccess={() => handleFilesUpdated('File uploaded successfully!')} />

      <FileList 
        key={fileRefreshTrigger} 
        onFileDeleted={() => handleFilesUpdated('File deleted successfully!')} 
        initialPageSize={10}
      />
    </Container>
  );
};

export default Dashboard;
