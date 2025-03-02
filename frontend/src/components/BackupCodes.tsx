import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import WarningIcon from '@mui/icons-material/Warning';

const BackupCodes: React.FC = () => {
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerateDialog, setRegenerateDialog] = useState(false);
  const { generateBackupCodes } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    generateCodes();
  }, []);

  const generateCodes = async () => {
    setLoading(true);
    try {
      const { backupCodes: codes } = await generateBackupCodes();
      setBackupCodes(codes);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate backup codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCodes = async () => {
    setRegenerateDialog(false);
    await generateCodes();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDone = () => {
    navigate('/account/security');
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }} id="backup-codes-container">
      <Typography variant="h4" component="h1" gutterBottom>
        Backup Codes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6" component="h2">
                Keep these backup codes safe
              </Typography>
            </Box>

            <Typography variant="body1" paragraph>
              If you lose access to your authenticator app, you can use one of these backup codes to sign in. Each code can only be used once.
            </Typography>

            <Alert severity="warning" sx={{ mb: 3 }}>
              These codes will not be shown again. Print or save them somewhere secure.
            </Alert>

            <Grid container spacing={2} sx={{ mb: 4 }}>
              {backupCodes.map((code, index) => (
                <Grid item xs={6} key={index}>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      textAlign: 'center',
                      fontSize: '1rem',
                      letterSpacing: 1,
                    }}
                  >
                    {code}
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="outlined"
                onClick={() => setRegenerateDialog(true)}
                disabled={loading}
              >
                Regenerate Codes
              </Button>

              <Box>
                <Button
                  variant="outlined"
                  onClick={handlePrint}
                  sx={{ mr: 1 }}
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  onClick={handleDone}
                >
                  Done
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>
      
      {/* Confirmation Dialog for Regenerating Codes */}
      <Dialog
        open={regenerateDialog}
        onClose={() => setRegenerateDialog(false)}
      >
        <DialogTitle>Regenerate Backup Codes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will invalidate your current backup codes and generate new ones. Make sure you save the new codes.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialog(false)}>Cancel</Button>
          <Button onClick={handleRegenerateCodes} color="primary">
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupCodes;
