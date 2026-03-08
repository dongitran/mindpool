import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Error handler (must be after routes)
app.use(errorHandler);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect MongoDB & start server
async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[MongoDB] Connected successfully');

    const server = app.listen(config.port, () => {
      console.log(`[Server] Running on http://localhost:${config.port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] ${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await mongoose.disconnect();
        console.log('[MongoDB] Disconnected');
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

start();

export { app };
