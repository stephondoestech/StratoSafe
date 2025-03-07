import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/api';
import { useThemeMode } from './ThemeContext';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mfaEnabled?: boolean;
  themePreference?: string;
}

interface MfaSetup {
  secret: string;
  qrCode: string;
}

interface BackupCodes {
  backupCodes: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresMfa: boolean;
  pendingMfaEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  verifyMfa: (token: string, isBackupCode?: boolean) => Promise<void>;
  register: (userData: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  setupMfa: () => Promise<MfaSetup>;
  enableMfa: (token: string) => Promise<void>;
  disableMfa: () => Promise<void>;
  generateBackupCodes: () => Promise<BackupCodes>;
  getMfaStatus: () => Promise<{ mfaEnabled: boolean; hasBackupCodes: boolean }>;
  clearMfaState: () => void;
  updateProfile: (userData: { firstName?: string; lastName?: string; email?: string; themePreference?: string }) => Promise<User>;
  updateThemePreference: (themePreference: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [pendingMfaEmail, setPendingMfaEmail] = useState<string | null>(null);
  
  // Access the theme context to sync user preferences
  const { mode, toggleColorMode } = useThemeMode();
  
  // User Profile Update
  const updateProfile = async (userData: { firstName?: string; lastName?: string; email?: string; themePreference?: string }) => {
    const updatedUser = await authService.updateUserProfile(userData);
    setUser(updatedUser);
    
    // If theme preference was updated, ensure the theme context is in sync
    if (userData.themePreference && userData.themePreference !== mode) {
      toggleColorMode(); // Toggle the theme to match the new preference
    }
    
    return updatedUser;
  };

  // Update only theme preference
  const updateThemePreference = async (themePreference: string) => {
    await authService.updateThemePreference(themePreference);
    
    // Update the user object in state
    if (user) {
      setUser({ ...user, themePreference });
    }
    
    // Ensure the theme context is in sync
    if ((themePreference === 'dark' && mode === 'light') || 
        (themePreference === 'light' && mode === 'dark')) {
      toggleColorMode();
    }
  };

  // Password Change
  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  };

  // Apply user's theme preference when profile is loaded
  useEffect(() => {
    if (user?.themePreference && user.themePreference !== mode) {
      toggleColorMode(); // Sync theme with user's preference
    }
  }, [user, mode, toggleColorMode]);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (token) {
        try {
          const userData = await authService.getUserProfile();
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user profile:', error);
          localStorage.removeItem('token');
          setToken(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    
    // Check if MFA is required
    if (response.requiresMfa) {
      setRequiresMfa(true);
      setPendingMfaEmail(response.email);
      return;
    }

    // Normal login flow
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    
    // Clear any MFA state
    setRequiresMfa(false);
    setPendingMfaEmail(null);
  };

  const verifyMfa = async (token: string, isBackupCode: boolean = false) => {
    if (!pendingMfaEmail) {
      throw new Error('No pending MFA verification');
    }

    const response = await authService.verifyMfa(pendingMfaEmail, token, isBackupCode);
    
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    
    // Clear MFA state
    setRequiresMfa(false);
    setPendingMfaEmail(null);
  };

  const clearMfaState = () => {
    setRequiresMfa(false);
    setPendingMfaEmail(null);
  };

  const register = async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    await authService.register(userData);
    // After registration, log the user in
    await login(userData.email, userData.password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setRequiresMfa(false);
    setPendingMfaEmail(null);
  };

  // MFA setup methods
  const setupMfa = async () => {
    return await authService.setupMfa();
  };

  const enableMfa = async (token: string) => {
    return await authService.enableMfa(token);
  };

  const disableMfa = async () => {
    return await authService.disableMfa();
  };

  const generateBackupCodes = async () => {
    return await authService.generateBackupCodes();
  };

  const getMfaStatus = async () => {
    return await authService.getMfaStatus();
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    requiresMfa,
    pendingMfaEmail,
    login,
    verifyMfa,
    register,
    logout,
    setupMfa,
    enableMfa,
    disableMfa,
    generateBackupCodes,
    getMfaStatus,
    clearMfaState,
    updateProfile,
    updateThemePreference,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
