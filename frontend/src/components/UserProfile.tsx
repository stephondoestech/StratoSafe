import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import PersonIcon from '@mui/icons-material/Person';

const UserProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Only send fields that have changed
      const changedFields: {[key: string]: string} = {};
      
      if (formData.firstName !== user?.firstName) {
        changedFields.firstName = formData.firstName;
      }
      
      if (formData.lastName !== user?.lastName) {
        changedFields.lastName = formData.lastName;
      }
      
      if (formData.email !== user?.email) {
        changedFields.email = formData.email;
      }
      
      // Only make the API call if there are changes
      if (Object.keys(changedFields).length > 0) {
        await updateProfile(changedFields);
        setSuccess('Profile updated successfully');
      } else {
        setSuccess('No changes were made');
      }
      
      setEditMode(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current user data
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    });
    setEditMode(false);
    setError(null);
    setSuccess(null);
  };

  // Function to get the user's initials for the avatar
  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
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

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: 'primary.main', 
              fontSize: '2rem',
              mr: 3
            }}
          >
            {getInitials()}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="firstName"
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={loading || !editMode}
                variant={editMode ? "outlined" : "filled"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={loading || !editMode}
                variant={editMode ? "outlined" : "filled"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading || !editMode}
                variant={editMode ? "outlined" : "filled"}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            {editMode ? (
              <>
                <Button 
                  onClick={handleCancel}
                  sx={{ mr: 2 }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => setEditMode(true)}
                startIcon={<PersonIcon />}
              >
                Edit Profile
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default UserProfile;
