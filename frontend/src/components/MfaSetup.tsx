import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Divider,
  Link,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

const MfaSetup: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setupMfa, enableMfa, getMfaStatus } = useAuth();

  // Step 1: Load MFA setup data
  useEffect(() => {
    const loadMfaSetup = async () => {
      if (activeStep === 0) {
        setLoading(true);
        try {
          const data = await setupMfa();
          setQrCode(data.qrCode);
          setSecret(data.secret);
          setActiveStep(1);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to load MFA setup. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    loadMfaSetup();
  }, [setupMfa]);

  // Step 2: Verify MFA token and enable MFA
  const handleVerifyToken = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await enableMfa(token);
      setActiveStep(2);
      
      // Refresh MFA status
      await getMfaStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle generating backup codes
  const handleGenerateBackupCodes = async () => {
    setError(null);
    setLoading(true);

    try {
      const { backupCodes: codes } = await authService.generateBackupCodes();
      setBackupCodes(codes);
      setActiveStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate backup codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Initialize', 'Scan QR Code', 'Enable MFA', 'Backup Codes'];

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          Set Up Two-Factor Authentication
        </Typography>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading && activeStep === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Scan the QR Code
                </Typography>
                <Typography variant="body2" paragraph>
                  Scan this QR code with your authenticator app (such as Google Authenticator, Authy, or Microsoft Authenticator).
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <img src={qrCode} alt="QR Code for MFA" style={{ maxWidth: '200px' }} />
                </Box>

                <Typography variant="h6" gutterBottom>
                  Or enter this code manually:
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1, 
                    fontFamily: 'monospace',
                    overflowWrap: 'break-word', 
                    my: 2 
                  }}
                >
                  {secret}
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Verify Setup
                </Typography>
                <Typography variant="body2" paragraph>
                  Enter the code from your authenticator app to verify the setup.
                </Typography>

                <TextField
                  fullWidth
                  label="Authentication Code"
                  variant="outlined"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="6-digit code"
                  inputProps={{ maxLength: 6, pattern: '[0-9]{6}' }}
                  sx={{ mb: 3 }}
                />

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleVerifyToken}
                  disabled={token.length !== 6 || loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify'}
                </Button>
              </Box>
            )}

            {activeStep === 2 && (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  Two-factor authentication has been successfully enabled!
                </Alert>

                <Typography variant="h6" gutterBottom>
                  Generate Backup Codes
                </Typography>
                <Typography variant="body2" paragraph>
                  Backup codes can be used to access your account if you lose access to your authenticator app.
                  You should store these codes in a secure place.
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateBackupCodes}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Generate Backup Codes'}
                </Button>
              </Box>
            )}

            {activeStep === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Your Backup Codes
                </Typography>
                <Typography variant="body2" paragraph color="error">
                  Save these backup codes in a secure place. Each code can only be used once.
                </Typography>

                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {backupCodes.map((code, index) => (
                    <Grid item xs={6} key={index}>
                      <Box
                        sx={{
                          p: 1,
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          textAlign: 'center',
                        }}
                      >
                        {code}
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Alert severity="warning" sx={{ mb: 3 }}>
                  These codes will only be shown once. Make sure to save them now!
                </Alert>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  component={Link}
                  href="/dashboard"
                >
                  Done
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default MfaSetup;
