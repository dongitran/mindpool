import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StopSignalDetector } from '../../queue/StopSignalDetector';

// Mock redis
vi.mock('../../lib/redis', () => {
  const store = new Map<string, Record<string, string>>();
  return {
    redis: {
      hgetall: vi.fn(async (key: string) => store.get(key) || {}),
      hset: vi.fn(async (key: string, field: string, value: string) => {
        if (!store.has(key)) store.set(key, {});
        store.get(key)![field] = value;
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      expire: vi.fn(async () => { }),
    },
    POOL_LOCK_TTL_SEC: 300,
  };
});

describe('StopSignalDetector', () => {
  let detector: StopSignalDetector;

  beforeEach(async () => {
    vi.clearAllMocks();
    detector = new StopSignalDetector('pool1');
    await detector.reset();
  });

  describe('shouldStop', () => {
    it('should not stop when no signals are set', async () => {
      expect(await detector.shouldStop()).toBe(false);
    });

    it('should not stop when only queueEmpty is true', async () => {
      await detector.checkQueueEmpty(0);
      expect(await detector.shouldStop()).toBe(false);
    });

    it('should not stop when only userTrigger is true', async () => {
      await detector.checkUserTrigger('cảm ơn');
      expect(await detector.shouldStop()).toBe(false);
    });

    it('should stop when both queueEmpty AND userTrigger are true', async () => {
      await detector.checkQueueEmpty(0);
      await detector.checkUserTrigger('cảm ơn');
      expect(await detector.shouldStop()).toBe(true);
    });
  });

  describe('checkQueueEmpty', () => {
    it('should set queueEmpty=true when size is 0', async () => {
      await detector.checkQueueEmpty(0);
      expect((await detector.getSignals()).queueEmpty).toBe(true);
    });

    it('should set queueEmpty=false when size > 0', async () => {
      await detector.checkQueueEmpty(3);
      expect((await detector.getSignals()).queueEmpty).toBe(false);
    });

    it('should update dynamically as queue changes', async () => {
      await detector.checkQueueEmpty(0);
      expect((await detector.getSignals()).queueEmpty).toBe(true);
      await detector.checkQueueEmpty(2);
      expect((await detector.getSignals()).queueEmpty).toBe(false);
    });
  });

  describe('checkUserTrigger', () => {
    it.each([
      ['okay', true],
      ['cảm ơn', true],
      ['đủ rồi', true],
      ['kết thúc', true],
      ['OKAY thanks', true],
      ['Cảm Ơn mọi người', true],
      ['tiếp tục thảo luận', false],
      ['tôi nghĩ rằng', false],
      ['', false],
    ])('"%s" → userTrigger=%s', async (message, expected) => {
      await detector.checkUserTrigger(message);
      expect((await detector.getSignals()).userTrigger).toBe(expected);
    });

    it('should be case-insensitive', async () => {
      await detector.checkUserTrigger('OKAY');
      expect((await detector.getSignals()).userTrigger).toBe(true);
    });

    it('should match substrings', async () => {
      await detector.checkUserTrigger('vâng okay rồi nhé');
      expect((await detector.getSignals()).userTrigger).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all signals', async () => {
      await detector.checkQueueEmpty(0);
      await detector.checkUserTrigger('okay');
      expect(await detector.shouldStop()).toBe(true);

      await detector.reset();
      expect(await detector.shouldStop()).toBe(false);
      expect(await detector.getSignals()).toEqual({ queueEmpty: false, userTrigger: false, maxTurnsReached: false });
    });
  });
});
