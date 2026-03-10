import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueManager } from '../../queue/QueueManager';

// Mock redis
vi.mock('../../lib/redis', () => {
  const lists = new Map<string, string[]>();
  return {
    redis: {
      rpush: vi.fn(async (key: string, value: string) => {
        if (!lists.has(key)) lists.set(key, []);
        lists.get(key)!.push(value);
      }),
      lpop: vi.fn(async (key: string) => {
        if (!lists.has(key)) return null;
        const list = lists.get(key)!;
        return list.length > 0 ? list.shift()! : null;
      }),
      lrange: vi.fn(async (key: string, _start: number, _stop: number) => {
        if (!lists.has(key)) return [];
        return lists.get(key)!;
      }),
      llen: vi.fn(async (key: string) => {
        if (!lists.has(key)) return 0;
        return lists.get(key)!.length;
      }),
      del: vi.fn(async (key: string) => {
        lists.delete(key);
      }),
      expire: vi.fn(async () => { }),
    },
    POOL_LOCK_TTL_SEC: 300,
  };
});

describe('QueueManager', () => {
  let queue: QueueManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    queue = new QueueManager('pool1');
    await queue.clear();
  });

  describe('addToQueue', () => {
    it('should add an agent and return true', async () => {
      expect(await queue.addToQueue('agent-1')).toBe(true);
      expect(await queue.getSize()).toBe(1);
    });

    it('should reject duplicate agents', async () => {
      await queue.addToQueue('agent-1');
      expect(await queue.addToQueue('agent-1')).toBe(false);
      expect(await queue.getSize()).toBe(1);
    });

    it('should enforce maxDepth of 4', async () => {
      await queue.addToQueue('agent-1');
      await queue.addToQueue('agent-2');
      await queue.addToQueue('agent-3');
      await queue.addToQueue('agent-4');
      expect(await queue.addToQueue('agent-5')).toBe(false);
      expect(await queue.getSize()).toBe(4);
    });
  });

  describe('popFromQueue', () => {
    it('should return null when empty', async () => {
      expect(await queue.popFromQueue()).toBeNull();
    });

    it('should pop in FIFO order', async () => {
      await queue.addToQueue('agent-1');
      await queue.addToQueue('agent-2');
      await queue.addToQueue('agent-3');

      expect(await queue.popFromQueue()).toBe('agent-1');
      expect(await queue.popFromQueue()).toBe('agent-2');
      expect(await queue.popFromQueue()).toBe('agent-3');
      expect(await queue.popFromQueue()).toBeNull();
    });

    it('should allow re-adding after pop', async () => {
      await queue.addToQueue('agent-1');
      await queue.popFromQueue();
      expect(await queue.addToQueue('agent-1')).toBe(true);
    });
  });

  describe('getQueue', () => {
    it('should return agents with 1-based positions', async () => {
      await queue.addToQueue('agent-a');
      await queue.addToQueue('agent-b');

      expect(await queue.getQueue()).toEqual([
        { agentId: 'agent-a', position: 1 },
        { agentId: 'agent-b', position: 2 },
      ]);
    });

    it('should return empty array when queue is empty', async () => {
      expect(await queue.getQueue()).toEqual([]);
    });
  });

  describe('isInQueue', () => {
    it('should return false for absent agent', async () => {
      expect(await queue.isInQueue('agent-1')).toBe(false);
    });

    it('should return true for present agent', async () => {
      await queue.addToQueue('agent-1');
      expect(await queue.isInQueue('agent-1')).toBe(true);
    });

    it('should return false after agent is popped', async () => {
      await queue.addToQueue('agent-1');
      await queue.popFromQueue();
      expect(await queue.isInQueue('agent-1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should empty the queue', async () => {
      await queue.addToQueue('agent-1');
      await queue.addToQueue('agent-2');
      await queue.clear();
      expect(await queue.getSize()).toBe(0);
      expect(await queue.getQueue()).toEqual([]);
    });
  });

  describe('isFull', () => {
    it('should return false when under capacity', async () => {
      await queue.addToQueue('agent-1');
      expect(await queue.isFull()).toBe(false);
    });

    it('should return true at max capacity', async () => {
      await queue.addToQueue('agent-1');
      await queue.addToQueue('agent-2');
      await queue.addToQueue('agent-3');
      await queue.addToQueue('agent-4');
      expect(await queue.isFull()).toBe(true);
    });
  });
});
