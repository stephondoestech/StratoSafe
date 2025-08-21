/**
 * Login Component Tests
 * Tests login form functionality and MFA flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider as CustomThemeProvider } from '../context/ThemeContext';
import * as api from '../services/api';

// Mock the API service
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme();
  
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CustomThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </CustomThemeProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should render login form', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    
    // Mock successful login response
    mockedApi.authService.login.mockResolvedValueOnce({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      token: 'mock-jwt-token',
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockedApi.authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'SecurePass123!'
      );
    });

    // Should navigate to dashboard on success
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should handle MFA required flow', async () => {
    const user = userEvent.setup();
    
    // Mock MFA required response
    mockedApi.authService.login.mockResolvedValueOnce({
      requiresMfa: true,
      email: 'test@example.com',
      message: 'MFA verification required',
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    // Fill and submit login form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Should show MFA verification form
    await waitFor(() => {
      expect(screen.getByText(/mfa verification required/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    });
  });

  it('should handle login errors', async () => {
    const user = userEvent.setup();
    
    // Mock login error
    mockedApi.authService.login.mockRejectedValueOnce({
      response: {
        data: { message: 'Invalid credentials' }
      }
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should validate form fields', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    // API should not be called
    expect(mockedApi.authService.login).not.toHaveBeenCalled();
  });

  it('should handle MFA verification', async () => {
    const user = userEvent.setup();
    
    // First mock MFA required
    mockedApi.authService.login.mockResolvedValueOnce({
      requiresMfa: true,
      email: 'test@example.com',
      message: 'MFA verification required',
    });

    // Then mock successful MFA verification
    mockedApi.authService.verifyMfa.mockResolvedValueOnce({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      token: 'mock-jwt-token',
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    // Login first
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for MFA form
    await waitFor(() => {
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    });

    // Enter MFA code
    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(mockedApi.authService.verifyMfa).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        false
      );
    });

    // Should navigate to dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should handle backup code verification', async () => {
    const user = userEvent.setup();
    
    // Mock MFA required and backup code verification
    mockedApi.authService.login.mockResolvedValueOnce({
      requiresMfa: true,
      email: 'test@example.com',
      message: 'MFA verification required',
    });

    mockedApi.authService.verifyMfa.mockResolvedValueOnce({
      user: { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
      token: 'mock-jwt-token',
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    // Login and get to MFA screen
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/use backup code/i)).toBeInTheDocument();
    });

    // Click use backup code
    await user.click(screen.getByText(/use backup code/i));

    await waitFor(() => {
      expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
    });

    // Enter backup code
    await user.type(screen.getByLabelText(/backup code/i), 'BACKUP123');
    await user.click(screen.getByRole('button', { name: /verify backup code/i }));

    await waitFor(() => {
      expect(mockedApi.authService.verifyMfa).toHaveBeenCalledWith(
        'test@example.com',
        'BACKUP123',
        true
      );
    });
  });
});