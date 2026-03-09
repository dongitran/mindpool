import { redis } from './redis';

/**
 * Publish an SSE event to all instances serving this pool.
 * stream.ts subscribes to this channel and forwards to connected HTTP clients.
 */
export async function sendSSEToPool(poolId: string, event: object): Promise<void> {
  await redis.publish(`sse:pool:${poolId}`, JSON.stringify(event));
}
