import { redis, POOL_LOCK_TTL_SEC } from '../lib/redis';

const STOP_KEYWORDS = ['okay', 'cảm ơn', 'đủ rồi', 'kết thúc'];

export class StopSignalDetector {
  constructor(private poolId: string) { }

  private get key(): string {
    return `pool:${this.poolId}:signals`;
  }

  async checkQueueEmpty(queueSize: number): Promise<void> {
    const isQueueEmpty = queueSize === 0;
    await redis.hset(this.key, 'queueEmpty', isQueueEmpty ? '1' : '0');
    await redis.expire(this.key, POOL_LOCK_TTL_SEC);
  }

  async checkUserTrigger(message: string): Promise<void> {
    const lower = message.toLowerCase().trim();
    const isTriggered = STOP_KEYWORDS.some((kw) => lower.includes(kw));
    if (isTriggered) {
      await redis.hset(this.key, 'userTrigger', '1');
      await redis.expire(this.key, POOL_LOCK_TTL_SEC);
    }
  }

  async shouldStop(): Promise<boolean> {
    const signals = await this.getSignals();
    return signals.queueEmpty && signals.userTrigger;
  }

  async reset(): Promise<void> {
    await redis.del(this.key);
  }

  async getSignals(): Promise<{ queueEmpty: boolean; userTrigger: boolean }> {
    const data = await redis.hgetall(this.key);
    return {
      queueEmpty: data.queueEmpty === '1',
      userTrigger: data.userTrigger === '1',
    };
  }
}
