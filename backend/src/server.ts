import express, { Request, Response } from 'express';
import cors from 'cors';
import { AppDataSource } from './data-source';
import userRoutes from './routes/userRoutes';
import fileRoutes from './routes/fileRoutes';
import * as path from 'path';
import rateLimit from 'express-rate-limit';
import { getGlobalSettings } from './controllers/systemSettingsController';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorMiddleware';

// Initialize express app
const app = express();
const PORT = config.PORT;

// Enhanced rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'production' ? 100 : 1000, // More restrictive in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to rate limit per user when authenticated
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    environment: config.NODE_ENV,
    version: '1.0.0',
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Serve static files in production
if (config.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// Initialize database connection
const startServer = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection initialized successfully');

    // Initialize global settings
    await getGlobalSettings();
    logger.info('System settings initialized');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${config.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to initialize database connection', { error });

    // In all environments except tests, exit on database failure
    if (config.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

startServer();
