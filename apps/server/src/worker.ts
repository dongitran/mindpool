import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './lib/logger';
import { startWorker, stopWorker } from './queue/worker';
import { redis, redisSub, redisWorker } from './lib/redis';

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('[Standalone Worker] MongoDB connected');

    // Start background worker
    startWorker().catch((err) => {
      logger.error('[Standalone Worker] Worker crashed', { error: err });
    });
    logger.info('[Standalone Worker] Meeting loop worker started');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`[Standalone Worker] ${signal} received, shutting down gracefully`);

      stopWorker();

      await mongoose.disconnect();
      logger.info('[Standalone Worker] MongoDB disconnected');

      await Promise.allSettled([redis.quit(), redisSub.quit(), redisWorker.quit()]);
      logger.info('[Standalone Worker] Redis disconnected');

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('[Standalone Worker] Failed to start worker', { error });
    process.exit(1);
  }
}

start();
