/**
 * Jest test setup file
 * Runs before all test suites
 */

import { jest, describe, it, expect } from '@jest/globals';

// Mock environment variables for testing BEFORE importing any modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-minimum-32-characters-long';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_DATABASE = 'stratosafe_test';
process.env.DB_SSL = 'false';
process.env.LOG_LEVEL = 'error'; // Minimize test output

// Mock console methods to reduce noise in tests
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: console.error, // Keep errors visible
  };
}

// Test database cleanup utilities
export const clearDatabase = async () => {
  // Will be implemented per test as needed
};

// Global test timeout
jest.setTimeout(30000);

// This is a setup file, not a test file
// Jest requires at least one test, so we add a placeholder
describe('Test Setup', () => {
  it('should configure test environment correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.LOG_LEVEL).toBe('error');
  });
});
