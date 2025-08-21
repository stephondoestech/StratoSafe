/**
 * Production-ready logger utility
 * Replaces console.log statements with structured logging
 */

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVEL: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

const shouldLog = (level: string): boolean => {
  const levels = ['error', 'warn', 'info', 'debug'];
  const currentLevel = process.env.LOG_LEVEL || 'info';
  const currentIndex = levels.indexOf(currentLevel);
  const requestedIndex = levels.indexOf(level);
  
  return requestedIndex <= currentIndex;
};

const formatMessage = (level: string, message: string, meta?: any): string => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(meta && { meta }),
  };
  
  return JSON.stringify(logEntry);
};

export const logger = {
  error: (message: string, error?: any): void => {
    if (shouldLog(LOG_LEVEL.ERROR)) {
      console.error(formatMessage(LOG_LEVEL.ERROR, message, error));
    }
  },

  warn: (message: string, meta?: any): void => {
    if (shouldLog(LOG_LEVEL.WARN)) {
      console.warn(formatMessage(LOG_LEVEL.WARN, message, meta));
    }
  },

  info: (message: string, meta?: any): void => {
    if (shouldLog(LOG_LEVEL.INFO)) {
      console.log(formatMessage(LOG_LEVEL.INFO, message, meta));
    }
  },

  debug: (message: string, meta?: any): void => {
    if (shouldLog(LOG_LEVEL.DEBUG)) {
      console.log(formatMessage(LOG_LEVEL.DEBUG, message, meta));
    }
  },
};