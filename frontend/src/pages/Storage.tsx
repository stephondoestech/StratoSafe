import React from 'react';
import { Box, Typography } from '@mui/material';
import StorageManagement from '../components/StorageManagement';

const Storage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Storage Management
      </Typography>
      
      <StorageManagement />
    </Box>
  );
};

export default Storage;
