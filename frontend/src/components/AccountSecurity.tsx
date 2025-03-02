import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import SecurityIcon from '@mui/icons-material/Security';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useNavigate } from 'react-router-dom';

const AccountSecurity: React.FC = () => {
  const [mfaStatus, setMfaStatus] = useState<{ mfaEnabled: boolean; hasBackupCodes: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDisableDialog, setOpenDisableDialog] = useState(false);
  const { user, getMfaStatus, disableMfa } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadMfaStatus = async () => {
      setLoading(true);
      try {
        const status = await getMfaStatus();
        setMfaStatus(status);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load MFA status. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadMfaStatus();
  }, [getMfaStatus]);

  const handleSetupMfa = () => {
    navigate('/account/mfa/setup');
  };

  const handleOpenDisableDialog = () => {
    setOpenDisableDialog(true);
  };

  const handleCloseDisableDialog = () => {
    setOpenDisableDialog(false);
  };

  const handleDisableMfa = async () => {
    setLoading(true);
    try {
      await disableMfa();
      setMfaStatus({ mfaEnabled: false, hasBackupCodes: false });
      setError(null);
      handleCloseDisableDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable MFA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBackupCodes = () => {
    navigate('/account/mfa/backup-codes');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Account Security
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon sx={{ mr: 1 }} />
          <Typography variant="h5" component="h2">
            Two-Factor Authentication (2FA)
          </Typography>
        </Box>

        <Typography variant="body1" paragraph>
          Two-factor authentication adds an extra layer of security to your account by requiring access to your phone in addition to your password.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 3 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Status:
                </Typography>
                {mfaStatus?.mfaEnabled ? (
                  <Chip
                    label="Enabled"
                    color="success"
                    size="small"
                    icon={<SecurityIcon />}
                  />
                ) : (
                  <Chip
                    label="Disabled"
                    color="error"
                    size="small"
                    icon={<LockOpenIcon />}
                  />
                )}
              </Box>

              {mfaStatus?.mfaEnabled ? (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleOpenDisableDialog}
                  disabled={loading}
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSetupMfa}
                  disabled={loading}
                >
                  Enable 2FA
                </Button>
              )}
            </Box>

            {mfaStatus?.mfaEnabled && (
              <>
                <Divider sx={{ my: 3 }} />

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Backup Codes
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Backup codes can be used to access your account if you lose access to your authenticator app.
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Status:
                      </Typography>
                      {mfaStatus?.hasBackupCodes ? (
                        <Chip
                          label="Available"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="Not Generated"
                          color="warning"
                          size="small"
                        />
                      )}
                    </Box>

                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleGenerateBackupCodes}
                      disabled={loading}
                    >
                      {mfaStatus?.hasBackupCodes ? 'Regenerate Backup Codes' : 'Generate Backup Codes'}
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </Paper>

      {/* Disable MFA Confirmation Dialog */}
      <Dialog
        open={openDisableDialog}
        onClose={handleCloseDisableDialog}
      >
        <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Disabling two-factor authentication will make your account less secure. Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDisableDialog}>Cancel</Button>
          <Button onClick={handleDisableMfa} color="error">
            {loading ? <CircularProgress size={24} /> : 'Disable 2FA'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountSecurity;
