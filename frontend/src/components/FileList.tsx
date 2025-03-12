import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tooltip,
  TablePagination,
  TableSortLabel,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import MovieIcon from '@mui/icons-material/Movie';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FolderIcon from '@mui/icons-material/Folder';
import { fileService } from '../services/api';
import { FileMetadata, PaginatedResponse, SortOrder } from '../types/file.interfaces';
import { useAuth } from '../context/AuthContext';

// Type for file list props
interface FileListProps {
  onFileDeleted: (message?: string) => void;
  initialPageSize?: number;
}

// Using directly typed API response instead of passing files via props
const FileList: React.FC<FileListProps> = ({ onFileDeleted, initialPageSize = 10 }) => {
  // Get auth context to check if user is admin
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // State for files, loading, and error conditions
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFiles, setTotalFiles] = useState(0);
  
  // State for file deletion confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);
  
  // State for sorting
  const [orderBy, setOrderBy] = useState<keyof FileMetadata>('uploadedAt');
  const [order, setOrder] = useState<SortOrder>('desc');
  
  // State for action menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);
  
  // Reset page when search term changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm]);

  console.log('Is admin check:', user?.role, isAdmin);

  // Fetch files from the API with pagination and sorting
  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: PaginatedResponse<FileMetadata> = await fileService.getUserFiles({
        page,
        limit: rowsPerPage,
        sortBy: orderBy as any,
        order,
        search: debouncedSearchTerm
      });
      
      setFiles(response.data);
      console.log('Files received from API:', response.data);
      setTotalFiles(response.meta.total);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load your files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch files when pagination, sorting, or search changes
  useEffect(() => {
    fetchFiles();
  }, [page, rowsPerPage, orderBy, order, debouncedSearchTerm]);

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle sort request
  const handleRequestSort = (property: keyof FileMetadata) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Create sort handler for a specific property
  const createSortHandler = (property: keyof FileMetadata) => () => {
    handleRequestSort(property);
  };

  // Handle file download
  const handleDownload = async (fileId: string, originalName: string) => {
    try {
      const blob = await fileService.downloadFile(fileId) as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file. Please try again.');
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (file: FileMetadata) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  // Confirm file deletion
  const confirmDelete = async () => {
    if (fileToDelete) {
      try {
        await fileService.deleteFile(fileToDelete.id);
        onFileDeleted(`File "${fileToDelete.originalName}" deleted successfully`);
        closeDeleteDialog();
        fetchFiles(); // Refresh file list
      } catch (error) {
        console.error('Error deleting file:', error);
        setError('Failed to delete file. Please try again.');
      }
    }
  };

  // Get icon based on file type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon />;
    } else if (mimeType.startsWith('video/')) {
      return <MovieIcon />;
    } else if (mimeType.startsWith('audio/')) {
      return <MusicNoteIcon />;
    } else if (mimeType.startsWith('text/') || mimeType.includes('document')) {
      return <DescriptionIcon />;
    } else {
      return <InsertDriveFileIcon />;
    }
  };

  // Format file size (bytes to KB, MB, etc.)
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateInput: Date | string) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleString();
  };

  // Handle opening the action menu
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, file: FileMetadata) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  // Handle closing the action menu
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setSelectedFile(null);
  };
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Render file stats cards (admin only)
  const renderFileStats = () => {
    if (!isAdmin) return null;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          File Statistics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Files
                </Typography>
                <Typography variant="h5" component="div">
                  {totalFiles}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {isAdmin && (
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Admin View
                  </Typography>
                  <Typography variant="body2">
                    <Chip 
                      icon={<AdminPanelSettingsIcon />} 
                      label="Admin privileges active" 
                      color="primary" 
                      size="small" 
                    />
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Sort By
                </Typography>
                <Typography variant="body2">
                  {orderBy} ({order})
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Render loading state
  if (loading && page === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body1">Loading your files...</Typography>
      </Paper>
    );
  }

  // Render error state
  if (error && !files.length) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchFiles}>
          Try Again
        </Button>
      </Paper>
    );
  }

  // Render empty state
  if (!loading && files.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" align="center">
          No files {debouncedSearchTerm ? 'match your search' : 'uploaded yet'}
        </Typography>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          {debouncedSearchTerm ? (
            <Button onClick={() => setSearchTerm('')}>Clear Search</Button>
          ) : (
            "Click \"Upload New File\" above to get started"
          )}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Your Files {isAdmin && <Chip size="small" color="primary" icon={<AdminPanelSettingsIcon />} label="Admin View" sx={{ ml: 1 }} />}
          </Typography>
          
          <TextField
            placeholder="Search files..."
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: '250px' } }}
          />
        </Box>
        
        {renderFileStats()}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'originalName'}
                    direction={orderBy === 'originalName' ? order : 'asc'}
                    onClick={createSortHandler('originalName')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Description</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'size'}
                    direction={orderBy === 'size' ? order : 'asc'}
                    onClick={createSortHandler('size')}
                  >
                    Size
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'uploadedAt'}
                    direction={orderBy === 'uploadedAt' ? order : 'asc'}
                    onClick={createSortHandler('uploadedAt')}
                  >
                    Uploaded
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && page > 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} sx={{ my: 1 }} />
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{getFileIcon(file.mimeType)}</TableCell>
                    <TableCell>
                      <Tooltip title={file.originalName}>
                        <Typography noWrap sx={{ maxWidth: 200 }}>
                          {file.originalName}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {file.description ? (
                        <Tooltip title={file.description}>
                          <Typography noWrap sx={{ maxWidth: 200 }}>
                            {file.description}
                          </Typography>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{formatDate(file.uploadedAt)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Download">
                          <IconButton
                            color="primary"
                            onClick={() => handleDownload(file.id, file.originalName)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => openDeleteDialog(file)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="More actions">
                          <IconButton
                            onClick={(e) => handleOpenMenu(e, file)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                        {file.path && (
                          <Tooltip title="You have access to the file path">
                            <Chip 
                              size="small" 
                              color="info" 
                              label={isAdmin ? "Admin" : "Owner"} 
                              sx={{ ml: 1 }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalFiles}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Action menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          if (selectedFile) handleDownload(selectedFile.id, selectedFile.originalName);
          handleCloseMenu();
        }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          Download
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedFile) openDeleteDialog(selectedFile);
          handleCloseMenu();
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete</Typography>
        </MenuItem>
        
        {/* Show file path only if available (admin/owner) */}
        {selectedFile && selectedFile.path && (
          <MenuItem onClick={handleCloseMenu}>
            <ListItemIcon>
              <DescriptionIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Path: {selectedFile.path}
            </Typography>
          </MenuItem>
        )}
        
        {/* Show owner info if available (admin only) */}
        {selectedFile && selectedFile.ownerEmail && (
          <MenuItem onClick={handleCloseMenu}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">
              Owner: {selectedFile.ownerName || selectedFile.ownerEmail}
            </Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{fileToDelete?.originalName}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileList;
