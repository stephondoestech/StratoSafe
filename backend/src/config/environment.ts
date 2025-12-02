/**
 * Environment Configuration & Validation
 * Ensures all required environment variables are present before server starts
 */

import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

interface EnvironmentConfig {
  // Server Configuration
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Security
  JWT_SECRET: string;
  
  // Database Configuration
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SSL: boolean;
  
  // Optional
  LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';

  // Upload constraints
  UPLOAD_MAX_SIZE_MB: number;
  UPLOAD_MAX_SIZE_BYTES: number;
  UPLOAD_ALLOWED_MIME: string[];
}

class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const validateAndGetConfig = (): EnvironmentConfig => {
  const requiredVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE'
  ];

  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the required values.'
    );
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new ConfigError(
      'JWT_SECRET must be at least 32 characters long for security. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new ConfigError(
      'NODE_ENV must be one of: development, production, test'
    );
  }

  // Upload configuration
  const uploadMaxSizeMb = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10);
  if (Number.isNaN(uploadMaxSizeMb) || uploadMaxSizeMb <= 0) {
    throw new ConfigError('UPLOAD_MAX_SIZE_MB must be a positive integer (megabytes).');
  }

  const uploadAllowedMime = (process.env.UPLOAD_ALLOWED_MIME || 'image/png,image/jpeg,application/pdf,application/zip,text/plain')
    .split(',')
    .map((mime) => mime.trim())
    .filter(Boolean);

  if (!uploadAllowedMime.length) {
    throw new ConfigError('UPLOAD_ALLOWED_MIME must include at least one MIME type.');
  }

  return {
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    JWT_SECRET: jwtSecret,
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_USERNAME: process.env.DB_USERNAME!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_DATABASE: process.env.DB_DATABASE!,
    DB_SSL: process.env.DB_SSL === 'true',
    LOG_LEVEL: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug' || 'info',
    UPLOAD_MAX_SIZE_MB: uploadMaxSizeMb,
    UPLOAD_MAX_SIZE_BYTES: uploadMaxSizeMb * 1024 * 1024,
    UPLOAD_ALLOWED_MIME: uploadAllowedMime,
  };
};

let config: EnvironmentConfig;

try {
  config = validateAndGetConfig();
  logger.info('Environment configuration validated successfully', {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    dbHost: config.DB_HOST,
    dbPort: config.DB_PORT,
    dbDatabase: config.DB_DATABASE,
    dbSsl: config.DB_SSL,
  });
} catch (error) {
  if (error instanceof ConfigError) {
    logger.error('Environment configuration error', { error: error.message });
    console.error('\n❌ Configuration Error:');
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

export { config };
