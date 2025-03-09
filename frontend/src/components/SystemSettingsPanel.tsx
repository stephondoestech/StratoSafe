import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Button,
  Divider,
  Chip,
  Collapse,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LockIcon from '@mui/icons-material/Lock';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import { authService } from '../services/api';
import UserRoleManagement from './UserRoleManagement';

const SystemSettingsPanel: React.FC = () => {
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);

  // Load current settings
  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const settings = await authService.getSystemSettings();
      console.log("Loaded settings:", settings);
      setAllowRegistration(settings.allowRegistration);
      
      // Check if we got the full settings object (admin)
      setIsAdmin(settings.id !== undefined);
    } catch (err: any) {
      console.error("Error loading settings:", err);
      setError(err.response?.data?.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Handle toggle change
  const handleToggleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    console.log(`Toggling registration to: ${newValue}`);
    
    // Optimistic UI update
    setAllowRegistration(newValue);
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await authService.updateSystemSettings({ allowRegistration: newValue });
      console.log("Settings updated successfully");
      setSuccess(`User registration ${newValue ? 'enabled' : 'disabled'} successfully`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error("Error updating settings:", err);
      setError(err.response?.data?.message || 'Failed to update settings');
      // Revert UI on error
      setAllowRegistration(!newValue);
    } finally {
      setSaving(false);
    }
  };

  const toggleRoleManagement = () => {
    setShowRoleManagement(!showRoleManagement);
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h5" component="h2">
            System Settings
          </Typography>
          
          {isAdmin && (
            <Chip
              icon={<AdminPanelSettingsIcon />}
              label="Admin"
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>
        
        <Button 
          variant="outlined" 
          size="small" 
          onClick={loadSettings}
          disabled={loading || saving}
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

      {!isAdmin ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Only administrators have access to modify system settings.
        </Alert>
      ) : (
        <>
          <Typography variant="body1" paragraph>
            Configure global system settings for your StratoSafe instance.
          </Typography>

          <Box sx={{ mt: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={allowRegistration}
                  onChange={handleToggleChange}
                  disabled={saving || !isAdmin}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {saving ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : (
                    <LockIcon sx={{ mr: 1, fontSize: 20 }} />
                  )}
                  <Typography>
                    Allow User Registration
                  </Typography>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
              When disabled, only existing users can log in, and new users cannot register.
              {!allowRegistration && (
                <Box component="span" sx={{ fontWeight: 'bold', color: 'error.main', display: 'block', mt: 1 }}>
                  User registration is currently disabled
                </Box>
              )}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  User Role Management
                </Typography>
              </Box>
              
              <Button 
                variant={showRoleManagement ? "outlined" : "contained"}
                color="primary"
                onClick={toggleRoleManagement}
              >
                {showRoleManagement ? "Hide" : "Manage User Roles"}
              </Button>
            </Box>
            
            <Typography variant="body2" paragraph>
              Assign administrative privileges to trusted users to help manage the system.
            </Typography>
            
            <Collapse in={showRoleManagement}>
              <UserRoleManagement />
            </Collapse>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default SystemSettingsPanel;
