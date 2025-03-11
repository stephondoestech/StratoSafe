import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  LinearProgress, 
  Alert,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ClearIcon from '@mui/icons-material/Clear';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { fileService } from '../services/api';

interface FileUploadProps {
  onUploadSuccess: (message?: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Create a ref for the file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Max file size (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      
      // Check file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value);
  };

  const handleClearFile = () => {
    setFile(null);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      // Set a fake progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          const newProgress = prevProgress + 10;
          return newProgress >= 90 ? 90 : newProgress; // Never reach 100% until actually done
        });
      }, 300);
      
      await fileService.uploadFile(file, description);
      
      // Clear the progress interval
      clearInterval(progressInterval);
      setProgress(100);
      
      // Reset form
      setFile(null);
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Call the success callback
      onUploadSuccess('File uploaded successfully!');
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Upload New File
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {!file ? (
          <Box 
            sx={{ 
              border: '2px dashed #ccc', 
              borderRadius: 2, 
              p: 3, 
              textAlign: 'center',
              mb: 2,
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              hidden
              onChange={handleFileChange}
              disabled={uploading}
              ref={fileInputRef}
            />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Drag & Drop or Click to Upload
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB
            </Typography>
          </Box>
        ) : (
          <Box 
            sx={{ 
              border: '2px solid #e0e0e0', 
              borderRadius: 2, 
              p: 2, 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InsertDriveFileIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="body1" noWrap sx={{ maxWidth: '300px' }}>
                  {file.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Remove file">
              <IconButton 
                onClick={handleClearFile} 
                disabled={uploading}
                color="default"
                size="small"
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        
        <TextField
          fullWidth
          label="Description (optional)"
          variant="outlined"
          value={description}
          onChange={handleDescriptionChange}
          disabled={uploading}
          sx={{ mb: 2 }}
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!file || uploading}
          startIcon={<CloudUploadIcon />}
          sx={{ mt: 1 }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              {progress}% Uploaded
            </Typography>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default FileUpload;
