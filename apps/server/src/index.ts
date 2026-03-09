import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';

const app = express();

// CORS — allow localhost in dev, restrict to MINDPOOL_HOST in production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(config.host ? [`https://${config.host}`] : []),
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api', apiRouter);

// Error handler (must be after routes)
app.use(errorHandler);

// Health check — verifies DB connectivity, not just process liveness
app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected', timestamp: new Date().toISOString() });
    return;
  }
  res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
});

// Connect MongoDB & start server
async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected');

    const server = app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();

export { app };
