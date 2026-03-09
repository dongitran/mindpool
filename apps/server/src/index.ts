import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';
import { redis, redisSub, redisWorker } from './lib/redis';
import { startWorker, stopWorker } from './queue/worker';

const app = express();

// CORS — allow localhost in dev, restrict to MINDPOOL_HOST in production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(config.host ? [`https://${config.host}`] : []),
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api', apiRouter);

// Error handler (must be after routes)
app.use(errorHandler);

// Health check — verifies DB + Redis connectivity
app.get('/health', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected', timestamp: new Date().toISOString() });
    return;
  }
  try {
    await redis.ping();
    res.json({ status: 'ok', db: 'connected', redis: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'connected', redis: 'disconnected', timestamp: new Date().toISOString() });
  }
});

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected');

    const server = app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
    });

    // Start background worker in same process (non-blocking)
    startWorker().catch((err) => {
      logger.error('Worker crashed', { error: err });
    });
    logger.info('Meeting loop worker started');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      stopWorker();

      server.close(async () => {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');

        await Promise.allSettled([redis.quit(), redisSub.quit(), redisWorker.quit()]);
        logger.info('Redis disconnected');

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
