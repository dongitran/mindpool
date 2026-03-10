import { redis, POOL_LOCK_TTL_SEC } from '../lib/redis';

export class QueueManager {
  private maxDepth = 4;

  constructor(private poolId: string) { }

  private get key(): string {
    return `pool:${this.poolId}:queue`;
  }

  async addToQueue(agentId: string): Promise<boolean> {
    // Atomic check-and-push using Lua
    // ARGV[1] = agentId, ARGV[2] = maxDepth, ARGV[3] = TTL
    const luaScript = `
      local qLen = redis.call('LLEN', KEYS[1])
      if qLen >= tonumber(ARGV[2]) then
        return 0
      end
      
      local items = redis.call('LRANGE', KEYS[1], 0, -1)
      for i=1, #items do
        if items[i] == ARGV[1] then
          return 0
        end
      end
      
      redis.call('RPUSH', KEYS[1], ARGV[1])
      redis.call('EXPIRE', KEYS[1], ARGV[3])
      return 1
    `;

    const result = await redis.eval(
      luaScript,
      1,
      this.key,
      agentId,
      this.maxDepth.toString(),
      POOL_LOCK_TTL_SEC.toString()
    );

    return result === 1;
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
