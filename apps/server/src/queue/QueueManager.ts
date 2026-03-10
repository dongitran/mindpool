import { redis, POOL_LOCK_TTL_SEC } from '../lib/redis';

export class QueueManager {
  private maxDepth = 4;

  constructor(private poolId: string) { }

  private get key(): string {
    return `pool:${this.poolId}:queue`;
  }

  async addToQueue(agentId: string): Promise<boolean> {
    const isFull = await this.isFull();
    if (isFull) return false;

    const inQueue = await this.isInQueue(agentId);
    if (inQueue) return false;

    await redis.rpush(this.key, agentId);
    await redis.expire(this.key, POOL_LOCK_TTL_SEC); // auto-cleanup after 5 mins of inactivity
    return true;
  }

  async popFromQueue(): Promise<string | null> {
    return redis.lpop(this.key);
  }

  async getQueue(): Promise<{ agentId: string; position: number }[]> {
    const queue = await redis.lrange(this.key, 0, -1);
    return queue.map((agentId, index) => ({
      agentId,
      position: index + 1,
    }));
  }

  async isInQueue(agentId: string): Promise<boolean> {
    const queue = await redis.lrange(this.key, 0, -1);
    return queue.includes(agentId);
  }

  async isFull(): Promise<boolean> {
    const size = await this.getSize();
    return size >= this.maxDepth;
  }

  async clear(): Promise<void> {
    await redis.del(this.key);
  }

  async getSize(): Promise<number> {
    return redis.llen(this.key);
  }
}
