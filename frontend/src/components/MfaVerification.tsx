import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Link,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const MfaVerification: React.FC = () => {
  const [token, setToken] = useState('');
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { verifyMfa, pendingMfaEmail, clearMfaState } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verifyMfa(token, isUsingBackupCode);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify MFA token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setToken('');
    setIsUsingBackupCode(!isUsingBackupCode);
    setError(null);
  };

  const handleGoBack = () => {
    clearMfaState();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 400,
        mx: 'auto',
        width: '100%',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          Two-Factor Authentication
        </Typography>

        <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
          Enter the authentication code for {pendingMfaEmail}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="token"
            label={isUsingBackupCode ? "Backup Code" : "Authentication Code"}
            name="token"
            autoComplete="off"
            autoFocus
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
            placeholder={isUsingBackupCode ? "Enter backup code" : "6-digit code"}
            inputProps={{ 
              maxLength: isUsingBackupCode ? 10 : 6,
              pattern: isUsingBackupCode ? "[A-Z0-9]+" : "[0-9]{6}"
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !token}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify'}
          </Button>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Link 
              component="button" 
              variant="body2" 
              onClick={toggleMode}
              sx={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              {isUsingBackupCode 
                ? "Use authentication app instead" 
                : "Use backup code instead"}
            </Link>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link 
              component="button" 
              variant="body2" 
              onClick={handleGoBack}
              sx={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              Back to login
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default MfaVerification;
