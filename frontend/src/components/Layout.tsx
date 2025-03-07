import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Tooltip,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import CloudIcon from '@mui/icons-material/Cloud';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonIcon from '@mui/icons-material/Person';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const Layout: React.FC = () => {
  const { isAuthenticated, logout, user, updateThemePreference } = useAuth();
  const { mode, toggleColorMode } = useThemeMode();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSecurity = () => {
    handleClose();
    navigate('/account/security');
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  // Handle theme toggle with persistence
  const handleThemeToggle = async () => {
    // Toggle the visual theme immediately for responsive feel
    toggleColorMode();
    
    // If user is logged in, also update preference in database
    if (isAuthenticated && user) {
      try {
        // Save the new preference (opposite of current mode)
        const newTheme = mode === 'light' ? 'dark' : 'light';
        await updateThemePreference(newTheme);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
        // If saving fails, revert the toggle to keep UI and data in sync
        toggleColorMode();
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <CloudIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'white' }}>
              StratoSafe
            </Typography>
          </Box>

          {/* Theme toggle icon with tooltip */}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton 
              color="inherit" 
              onClick={handleThemeToggle} 
              sx={{ mr: 1 }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {isAuthenticated ? (
            <Box>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircleIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {user?.email}
                  </Typography>
                </Box>
                <MenuItem onClick={() => { handleClose(); navigate('/account/profile'); }}>
                  <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                  My Profile
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleSecurity}>
                  <SecurityIcon sx={{ mr: 1, fontSize: 20 }} />
                  Security Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ExitToAppIcon sx={{ mr: 1, fontSize: 20 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 4 }}>
        <Outlet />
      </Container>

      <Box component="footer" sx={{ py: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} StratoSafe – Secure Your Files in the Cloud
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;
