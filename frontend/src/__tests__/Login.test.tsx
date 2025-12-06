import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider as CustomThemeProvider } from '../context/ThemeContext';
import * as api from '../services/api';

jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme();
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CustomThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </CustomThemeProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in successfully and calls API', async () => {
    const user = userEvent.setup();

    mockedApi.authService.login.mockResolvedValueOnce({
      token: 'mock-jwt-token',
      user: { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe', role: 'user' },
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockedApi.authService.login).toHaveBeenCalledWith('test@example.com', 'SecurePass123!');
    });
  });

  it('shows error on failed login', async () => {
    const user = userEvent.setup();

    mockedApi.authService.login.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
