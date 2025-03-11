import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import { storageService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ExternalStorageSettings: React.FC = () => {
  const [globalStorageEnabled, setGlobalStorageEnabled] = useState(false);
  const [userStorageEnabled, setUserStorageEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user, isAdmin } = useAuth(); 

  // Load current settings
  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get system settings
      const settings = await authService.getSystemSettings();
      setGlobalStorageEnabled(settings.allowExternalStorage || false);
      
      // Get user's external storage access
      if (user) {
        setUserStorageEnabled(user.externalStorageAccess || false);
      }
    } catch (err: any) {
      console.error("Error loading storage settings:", err);
      setError(err.response?.data?.message || 'Failed to load storage settings');
    } finally {
      setLoading(false);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [user]);

// Handle global toggle change (admin only)
const handleGlobalToggleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const newValue = event.target.checked;
  console.log(`Toggling global external storage to: ${newValue}`);
  setSaving(true);
  setError(null);
  setSuccess(null);
  
  try {
    // Optimistic UI update
    setGlobalStorageEnabled(newValue);
    
    // Make the API call
    const result = await storageService.updateExternalStorageSettings(newValue);
    console.log("Update result:", result);
    
    if (result.success) {
      setSuccess(`External storage access ${newValue ? 'enabled' : 'disabled'} globally`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } else {
      throw new Error("Failed to update global storage settings");
    }
  } catch (err: any) {
    console.error("Error updating global storage settings:", err);
    setError(err.response?.data?.message || 'Failed to update global storage settings');
    setGlobalStorageEnabled(!newValue); // Revert UI on error
  } finally {
    setSaving(false);
  }
};

  // Handle user toggle change
  const handleUserToggleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await storageService.updateUserExternalStorageAccess(newValue);
      setUserStorageEnabled(newValue);
      setSuccess(`External storage access ${newValue ? 'enabled' : 'disabled'} for your account`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update your storage access settings');
      setUserStorageEnabled(!newValue); // Revert UI on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <StorageIcon sx={{ mr: 1 }} />
        <Typography variant="h5" component="h2">
          External Storage Access
        </Typography>
      </Box>

      <Typography variant="body1" paragraph>
        External storage access allows you to connect to storage locations mapped to the container.
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Global setting (admin only) */}
          {isAdmin && (
            <>
              <Box sx={{ mt: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={globalStorageEnabled}
                      onChange={handleGlobalToggleChange}
                      disabled={saving}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {saving ? (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                      ) : (
                        <StorageIcon sx={{ mr: 1, fontSize: 20 }} />
                      )}
                      <Typography>
                        <strong>Global External Storage Access</strong>
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
                  When disabled, external storage is inaccessible for all users regardless of individual settings.
                </Typography>
              </Box>
              
              <Divider sx={{ my: 3 }} />
            </>
          )}

          {/* User-specific setting */}
          <Box sx={{ mt: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={userStorageEnabled}
                  onChange={handleUserToggleChange}
                  disabled={saving || !globalStorageEnabled}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {saving ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : (
                    <StorageIcon sx={{ mr: 1, fontSize: 20 }} />
                  )}
                  <Typography>
                    <strong>Personal External Storage Access</strong>
                  </Typography>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
              Enable access to external storage locations for your account.
              {!globalStorageEnabled && (
                <Box component="span" sx={{ fontWeight: 'bold', color: 'error.main', display: 'block', mt: 1 }}>
                  External storage access is currently disabled globally by the administrator.
                </Box>
              )}
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default ExternalStorageSettings;
