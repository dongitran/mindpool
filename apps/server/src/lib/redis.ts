import Redis from 'ioredis';
import { config } from '../config';

function createClient(name: string): Redis {
  const client = new Redis(config.redisUrl, { lazyConnect: false });
  client.on('error', (err) => {
    // Log but don't crash — ioredis auto-reconnects
    console.error(`[Redis:${name}] error:`, err.message);
  });
  return client;
}

// Main client: RPUSH, SET, GET, PUBLISH, etc.
export const redis = createClient('main');

// Dedicated subscriber: cannot run other commands while in subscribe mode
export const redisSub = createClient('sub');

// Dedicated worker client: used for BLPOP (blocks the connection while waiting)
export const redisWorker = createClient('worker');

export const MEETING_QUEUE_KEY = 'queue:meeting-loop';
export const POOL_LOCK_TTL_SEC = 900; // 15 phút (900s) - Đảm bảo lớn hơn Timeout dài nhất của LLM để tránh Zombie Lock
