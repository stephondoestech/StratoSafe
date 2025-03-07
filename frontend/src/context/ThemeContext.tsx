import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';
import { createAppTheme } from '../utils/theme';

// Theme context type
interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

// Custom hook to use the theme context
export const useThemeMode = () => useContext(ThemeContext);

// Props for ThemeProvider
interface ThemeProviderProps {
  children: React.ReactNode;
}

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Try to get the saved theme from localStorage, default to 'light'
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode === 'dark' || savedMode === 'light') ? savedMode : 'light';
  });

  // Generate theme based on current mode
  const theme = createAppTheme(mode);

  // Toggle between light and dark mode
  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  // Apply the preferred color scheme from OS if not set yet
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (!savedMode && window.matchMedia) {
      // Check if user has dark mode preference in their OS/browser
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDarkMode) {
        setMode('dark');
        localStorage.setItem('themeMode', 'dark');
      }
    }
  }, []);

  // Context value
  const contextValue = {
    mode,
    toggleColorMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
