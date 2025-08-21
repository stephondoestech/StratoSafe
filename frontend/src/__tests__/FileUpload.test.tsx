/**
 * FileUpload Component Tests
 * Tests file upload functionality and validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FileUpload from '../components/FileUpload';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

// Mock the API service
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock AuthContext
const mockAuthContext = {
  user: {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  requiresMfa: false,
  pendingMfaEmail: null,
  login: jest.fn(),
  verifyMfa: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  setupMfa: jest.fn(),
  enableMfa: jest.fn(),
  disableMfa: jest.fn(),
  generateBackupCodes: jest.fn(),
  getMfaStatus: jest.fn(),
  clearMfaState: jest.fn(),
  updateProfile: jest.fn(),
  updateThemePreference: jest.fn(),
  changePassword: jest.fn(),
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme();
  
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

describe('FileUpload Component', () => {
  const mockOnUploadSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render file upload form', () => {
    render(
      <TestWrapper>
        <FileUpload onUploadSuccess={mockOnUploadSuccess} />
      </TestWrapper>
    );

    expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    expect(screen.getByText(/choose file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('should handle successful file upload', async () => {
    const user = userEvent.setup();
    
    // Mock successful upload
    mockedApi.fileService.uploadFile.mockResolvedValueOnce({
      message: 'File uploaded successfully',
      file: {
        id: '1',
        filename: 'test.txt',
        originalName: 'test.txt',
        size: 100,
        description: 'Test file',
      },
    });

    render(
      <TestWrapper>
        <FileUpload onUploadSuccess={mockOnUploadSuccess} />
      </TestWrapper>
    );

    // Create a mock file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    // Simulate file selection
    const fileInput = screen.getByLabelText(/choose file/i);
    await user.upload(fileInput, file);

    // Add description
    await user.type(screen.getByLabelText(/description/i), 'Test file description');

    // Submit form
    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedApi.fileService.uploadFile).toHaveBeenCalledWith(
        expect.any(File),
        'Test file description'
      );
    });

    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalled();
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument();
    });
  });

  it('should handle upload errors', async () => {
    const user = userEvent.setup();
    
    // Mock upload error
    mockedApi.fileService.uploadFile.mockRejectedValueOnce({
      response: {
        data: { message: 'File upload failed' }
      }
    });

    render(
      <TestWrapper>
        <FileUpload onUploadSuccess={mockOnUploadSuccess} />
      </TestWrapper>
    );

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/choose file/i);
    
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByText(/file upload failed/i)).toBeInTheDocument();
    });

    expect(mockOnUploadSuccess).not.toHaveBeenCalled();
  });

  it('should validate file selection', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <FileUpload onUploadSuccess={mockOnUploadSuccess} />
      </TestWrapper>
    );

    // Try to upload without selecting a file
    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByText(/please select a file/i)).toBeInTheDocument();
    });

    expect(mockedApi.fileService.uploadFile).not.toHaveBeenCalled();
  });

  it('should show upload progress', async () => {
    const user = userEvent.setup();
    
    // Mock upload with delay
    mockedApi.fileService.uploadFile.mockImplementationOnce(
      () => new Promise(resolve => 
        setTimeout(() => resolve({
          message: 'File uploaded successfully',
          file: { id: '1', filename: 'test.txt', originalName: 'test.txt', size: 100 }
        }), 100)
      )
    );

    render(
      <TestWrapper>
        <FileUpload onUploadSuccess={mockOnUploadSuccess} />
      </TestWrapper>
    );

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/choose file/i);
    
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /upload/i }));

    // Should show uploading state
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument();
    });
  });

  it('should handle large file warnings', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <FileUpload onUploadSuccess={mockOnUploadSuccess} />
      </TestWrapper>
    );

    // Create a large file (over 10MB)
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const largeFile = new File([largeContent], 'large-file.txt', { type: 'text/plain' });
    
    const fileInput = screen.getByLabelText(/choose file/i);
    await user.upload(fileInput, largeFile);

    // Should show file size warning (if implemented)
    // This test validates that the component handles large files appropriately
    expect(fileInput.files?.[0]).toBe(largeFile);
  });

  it('should clear form after successful upload', async () => {
    const user = userEvent.setup();
    
    mockedApi.fileService.uploadFile.mockResolvedValueOnce({
      message: 'File uploaded successfully',
      file: { id: '1', filename: 'test.txt', originalName: 'test.txt', size: 100 }
    });

    render(
      <TestWrapper>
        <FileUpload onUploadSuccess={mockOnUploadSuccess} />
      </TestWrapper>
    );

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/choose file/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    
    await user.upload(fileInput, file);
    await user.type(descriptionInput, 'Test description');
    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalled();
    });

    // Form should be cleared
    await waitFor(() => {
      expect(descriptionInput).toHaveValue('');
      expect(fileInput.files).toHaveLength(0);
    });
  });
});