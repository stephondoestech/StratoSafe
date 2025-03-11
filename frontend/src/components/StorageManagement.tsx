// frontend/src/components/StorageManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import FolderIcon from '@mui/icons-material/Folder';
import { storageService } from '../services/api';
import { useAuth } from '../context/AuthContext';


// Define interface for storage configuration
interface StorageConfig {
  id: string;
  name: string;
  mountPath: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define interface for available path
interface AvailablePath {
  path: string;
  exists: boolean;
}

const StorageManagement: React.FC = () => {
  const [storageConfigs, setStorageConfigs] = useState<StorageConfig[]>([]);
  const [availablePaths, setAvailablePaths] = useState<AvailablePath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<StorageConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mountPath: '',
    displayName: '',
    description: '',
    isActive: true,
  });
  const { user } = useAuth();

  // Load storage configurations
  const loadStorageConfigs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get available paths
      const pathsResponse = await storageService.getAvailableStoragePaths();
      setAvailablePaths(pathsResponse.availablePaths || []);
      
      // Get storage configurations
      const configsResponse = await storageService.getAllStorageConfigs();
      setStorageConfigs(configsResponse || []);
      
      // Check if user is admin
      setIsAdmin(user?.role === 'admin');
    } catch (err: any) {
      console.error('Error loading storage data:', err);
      let errorMessage = err.response?.data?.message || 'Failed to load storage data';
      
      // Special handling for common error cases
      if (err.response?.status === 403) {
        if (err.response?.data?.message?.includes('not enabled globally')) {
          errorMessage = 'External storage is not enabled. Enable it in Security Settings first.';
        } else {
          errorMessage = 'You don\'t have permission to access external storage.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadStorageConfigs();
  }, [user]);

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | { target: { name?: string; value: unknown } }) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: '',
      mountPath: '',
      displayName: '',
      description: '',
      isActive: true,
    });
  };

  // Open add dialog
  const handleOpenAddDialog = () => {
    resetFormData();
    setOpenAddDialog(true);
  };

  // Close add dialog
  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  // Open edit dialog
  const handleOpenEditDialog = (config: StorageConfig) => {
    setCurrentConfig(config);
    setFormData({
      name: config.name,
      mountPath: config.mountPath,
      displayName: config.displayName,
      description: config.description || '',
      isActive: config.isActive,
    });
    setOpenEditDialog(true);
  };

  // Close edit dialog
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setCurrentConfig(null);
  };

  // Open delete dialog
  const handleOpenDeleteDialog = (config: StorageConfig) => {
    setCurrentConfig(config);
    setOpenDeleteDialog(true);
  };

  // Close delete dialog
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setCurrentConfig(null);
  };

  // Add new storage config
  const handleAddStorage = async () => {
    setError(null);
    
    try {
      await storageService.createStorageConfig({
        name: formData.name,
        mountPath: formData.mountPath,
        displayName: formData.displayName,
        description: formData.description,
      });
      
      setSuccess('Storage configuration added successfully');
      handleCloseAddDialog();
      loadStorageConfigs();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error adding storage config:', err);
      setError(err.response?.data?.message || 'Failed to add storage configuration');
    }
  };

  // Update storage config
  const handleUpdateStorage = async () => {
    if (!currentConfig) return;
    
    setError(null);
    
    try {
      await storageService.updateStorageConfig(currentConfig.id, {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description,
        isActive: formData.isActive,
      });
      
      setSuccess('Storage configuration updated successfully');
      handleCloseEditDialog();
      loadStorageConfigs();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error updating storage config:', err);
      setError(err.response?.data?.message || 'Failed to update storage configuration');
    }
  };

  // Delete storage config
  const handleDeleteStorage = async () => {
    if (!currentConfig) return;
    
    setError(null);
    
    try {
      await storageService.deleteStorageConfig(currentConfig.id);
      
      setSuccess('Storage configuration deleted successfully');
      handleCloseDeleteDialog();
      loadStorageConfigs();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error deleting storage config:', err);
      setError(err.response?.data?.message || 'Failed to delete storage configuration');
    }
  };

  // Handle checking for external storage that needs to be configured
  const renderExternalStorageStatus = () => {
    if (availablePaths.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">No External Storage Detected</Typography>
          <Typography variant="body2">
            To use external storage, you need to mount volumes in your Docker Compose configuration like this:
            <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, overflowX: 'auto' }}>
              {"${EXTERNAL_STORAGE_1:-./external-storage-1}:/mnt/external/storage1"}
            </Box>
          </Typography>
        </Alert>
      );
    }
    
    if (availablePaths.length > 0 && storageConfigs.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">External Storage Available</Typography>
          <Typography variant="body2">
            External storage paths are detected but not configured yet.
            {isAdmin ? ' Use the "Add Storage" button to configure them.' : ' Contact your administrator to configure them.'}
          </Typography>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StorageIcon sx={{ mr: 1 }} />
          <Typography variant="h5" component="h2">
            Storage Management
          </Typography>
        </Box>
        
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            disabled={loading || availablePaths.length === 0}
          >
            Add Storage
          </Button>
        )}
      </Box>

      <Typography variant="body1" paragraph>
        Manage external storage locations that are connected to your StratoSafe instance.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {renderExternalStorageStatus()}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {storageConfigs.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Display Name</TableCell>
                    <TableCell>Mount Path</TableCell>
                    <TableCell>Status</TableCell>
                    {isAdmin && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {storageConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>{config.name}</TableCell>
                      <TableCell>{config.displayName}</TableCell>
                      <TableCell>{config.mountPath}</TableCell>
                      <TableCell>
                        <Chip
                          label={config.isActive ? 'Active' : 'Inactive'}
                          color={config.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleOpenEditDialog(config)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton onClick={() => handleOpenDeleteDialog(config)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            !error && availablePaths.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No storage configurations available.
                  {isAdmin ? ' Click "Add Storage" to create one.' : ' Contact your administrator to set up storage.'}
                </Typography>
              </Box>
            )
          )}
          
          {availablePaths.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Available Storage Paths
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {availablePaths.map((path, index) => (
                  <Card key={index} sx={{ minWidth: 220, bgcolor: path.exists ? 'success.50' : 'error.50' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FolderIcon sx={{ mr: 1, color: path.exists ? 'success.main' : 'error.main' }} />
                        <Typography variant="subtitle1" component="div">
                          Storage {index + 1}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        {path.path}
                      </Typography>
                      <Chip
                        label={path.exists ? 'Available' : 'Not Found'}
                        color={path.exists ? 'success' : 'error'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Add Storage Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Storage Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Configure a new external storage location.
          </DialogContentText>
          
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel id="mount-path-label">Mount Path</InputLabel>
            <Select
              labelId="mount-path-label"
              id="mountPath"
              name="mountPath"
              value={formData.mountPath}
              onChange={(e) => handleInputChange(e)}
              label="Mount Path"
              required
            >
              {availablePaths.map((path, index) => (
                <MenuItem 
                  key={index} 
                  value={path.path}
                  disabled={!path.exists}
                >
                  {path.path} {!path.exists && "(Not Found)"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            id="name"
            name="name"
            label="Storage Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="displayName"
            name="displayName"
            label="Display Name"
            type="text"
            fullWidth
            value={formData.displayName}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Cancel</Button>
          <Button 
            onClick={handleAddStorage} 
            variant="contained"
            disabled={!formData.name || !formData.mountPath || !formData.displayName}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Storage Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Storage Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update the storage configuration.
          </DialogContentText>
          
          <TextField
            margin="dense"
            id="mountPath"
            name="mountPath"
            label="Mount Path"
            type="text"
            fullWidth
            value={formData.mountPath}
            disabled
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="name"
            name="name"
            label="Storage Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="displayName"
            name="displayName"
            label="Display Name"
            type="text"
            fullWidth
            value={formData.displayName}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    isActive: e.target.checked
                  });
                }}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            onClick={handleUpdateStorage} 
            variant="contained"
            disabled={!formData.name || !formData.displayName}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Storage Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Storage Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the storage configuration "{currentConfig?.displayName}"? 
            This will not delete any files, but will remove access to this storage location.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteStorage} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default StorageManagement;
