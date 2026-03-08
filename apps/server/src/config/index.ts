import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/mindpool',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  kimiApiKey: process.env.KIMI_API_KEY || '',
  minimaxApiKey: process.env.MINIMAX_API_KEY || '',
};
