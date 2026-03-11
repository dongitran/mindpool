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
import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';

const app = express();

// Trust the nginx reverse-proxy — needed for rate-limit-redis to identify
// clients correctly via X-Forwarded-For (nginx sets this header by default)
app.set('trust proxy', 1);

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

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<RedisReply> }),
  message: { error: { message: 'Too many requests, please try again later' } },
});

const poolCreateLimiter = rateLimit({
  windowMs: 60_000,
  max: isDev ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<RedisReply> }),
  message: { error: { message: 'Too many pool creation requests' } },
});

const messageLimiter = rateLimit({
  windowMs: 60_000,
  max: isDev ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<RedisReply> }),
  message: { error: { message: 'Too many messages, please slow down' } },
});

app.use('/api', globalLimiter);
app.use('/api/pool/create', poolCreateLimiter);
app.use('/api/conversations/:id/message', messageLimiter);
app.use('/api/pool/:id/message', messageLimiter);

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
  let redisStatus = 'connected';
  try {
    await redis.ping();
  } catch {
    // Redis down → degraded, not fatal — pod stays alive, DB still serves reads
    redisStatus = 'disconnected';
  }
  res.json({ status: 'ok', db: 'connected', redis: redisStatus, timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected');

    const server = app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
    });

    // Start background worker in same process (Conditionally for local dev)
    if (process.env.RUN_WORKER !== 'false') {
      startWorker().catch((err) => {
        logger.error('Worker crashed', { error: err });
      });
      logger.info('Meeting loop worker started in same process (Legacy dev mode)');
    } else {
      logger.info('Meeting loop worker disabled in API process (RUN_WORKER=false)');
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      if (process.env.RUN_WORKER !== 'false') {
        stopWorker();
      }

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
