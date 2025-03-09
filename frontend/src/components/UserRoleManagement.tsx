import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';

// Define user interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

const UserRoleManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    name: string;
    currentRole: string;
    newRole: string;
  }>({
    open: false,
    userId: '',
    name: '',
    currentRole: '',
    newRole: '',
  });
  
  const { user: currentUser } = useAuth();

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await authService.getAllUsers();
      console.log("Loaded users:", data);
      setUsers(data);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRoleChange = (event: SelectChangeEvent, user: User) => {
    const newRole = event.target.value;
    
    // Don't allow changing your own role
    if (user.id === currentUser?.id) {
      setError("You cannot change your own role");
      return;
    }
    
    // Open confirmation dialog
    setConfirmDialog({
      open: true,
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      currentRole: user.role,
      newRole
    });
  };

  const confirmRoleChange = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { userId, newRole } = confirmDialog;
      const response = await authService.updateUserRole(userId, newRole);
      
      // Update user in the list
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      setSuccess(`Role updated successfully for ${confirmDialog.name}`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error("Error updating role:", err);
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const cancelRoleChange = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  // Filter users to only show other users, not the current user
  const filteredUsers = users.filter(u => u.id !== currentUser?.id);
  
  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 1 }} />
          <Typography variant="h5" component="h2">
            User Role Management
          </Typography>
        </Box>
        
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={loadUsers}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

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

      <Typography variant="body1" paragraph>
        Manage user roles to control access to administrative features.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Show yourself at the top with a special indicator */}
                {users.filter(u => u.id === currentUser?.id).map((user) => (
                  <TableRow key={user.id} sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Chip 
                          label="You" 
                          size="small" 
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        icon={user.role === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                        label={user.role}
                        color={user.role === 'admin' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        Cannot modify own role
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Show other users with role selection */}
                {filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.firstName} {user.lastName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          icon={user.role === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                          label={user.role}
                          color={user.role === 'admin' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl variant="outlined" size="small" fullWidth>
                          <Select
                            value={user.role}
                            onChange={(e) => handleRoleChange(e, user)}
                            disabled={loading}
                          >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={cancelRoleChange}
      >
        <DialogTitle>
          Change User Role
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change {confirmDialog.name}'s role from <strong>{confirmDialog.currentRole}</strong> to <strong>{confirmDialog.newRole}</strong>?
            {confirmDialog.newRole === 'admin' && (
              <Box component="div" sx={{ color: 'error.main', mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Warning: This will grant {confirmDialog.name} full administrative privileges, including access to all system settings and user management.
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelRoleChange}>Cancel</Button>
          <Button 
            onClick={confirmRoleChange} 
            color={confirmDialog.newRole === 'admin' ? 'error' : 'primary'}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserRoleManagement;
