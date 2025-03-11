import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Divider, Alert, Snackbar } from '@mui/material';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  // State to track when files have been updated
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Get user info from auth context
  const { user } = useAuth();

  // Callback for when files are uploaded or deleted
  const handleFilesUpdated = (message?: string) => {
    // Increment the trigger to cause FileList to refresh
    setFileRefreshTrigger(prev => prev + 1);
    
    // Show feedback message if provided
    if (message) {
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    }
  };

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
            <Typography variant="body2" color="text.secondary">Manage your uploaded files</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">Security</Typography>
            <Typography variant="body2" color="text.secondary">Your files are securely stored</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">Access</Typography>
            <Typography variant="body2" color="text.secondary">Only you can access your files</Typography>
          </Box>
        </Box>
      </Paper>

      <FileUpload onUploadSuccess={() => handleFilesUpdated('File uploaded successfully!')} />

      <FileList 
        key={fileRefreshTrigger} 
        onFileDeleted={() => handleFilesUpdated('File deleted successfully!')} 
        initialPageSize={10}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Dashboard;
