import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Container } from '@mui/material';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import { fileService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const data = await fileService.getUserFiles();
      setFiles(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load your files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

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

      <FileUpload onUploadSuccess={fetchFiles} />

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <FileList files={files} onFileDeleted={fetchFiles} />
      )}
    </Container>
  );
};

export default Dashboard;
