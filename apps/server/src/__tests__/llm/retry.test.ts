import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger to suppress output during tests
vi.mock('../../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { withRetry } from '../../llm/retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 and succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('API error 429: Rate limited'))
      .mockResolvedValueOnce('retry success');

    const promise = withRetry(fn, 3, 10); // small delay for tests
    // Fast-forward timers for retry delay
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result).toBe('retry success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on 500 server errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('API error 500: Internal Server Error'))
      .mockRejectedValueOnce(new Error('API error 502: Bad Gateway'))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(fn, 3, 10);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should retry on network errors (fetch failed)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(fn, 3, 10);
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on ECONNRESET', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(fn, 3, 10);
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on ETIMEDOUT', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(fn, 3, 10);
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should NOT retry on non-retryable errors (401 Unauthorized)', async () => {
    const fn = vi.fn()
      .mockRejectedValue(new Error('API error 401: Unauthorized'));

    await expect(withRetry(fn, 3, 10)).rejects.toThrow('API error 401: Unauthorized');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on non-retryable errors (400 Bad Request)', async () => {
    const fn = vi.fn()
      .mockRejectedValue(new Error('API error 400: Bad Request'));

    await expect(withRetry(fn, 3, 10)).rejects.toThrow('API error 400: Bad Request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry non-Error exceptions', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    await expect(withRetry(fn, 3, 10)).rejects.toBe('string error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after exhausting all retries', async () => {
    vi.useRealTimers(); // Use real timers for this test to avoid unhandled rejection
    const fn = vi.fn().mockRejectedValue(new Error('API error 500: Server Error'));

    await expect(withRetry(fn, 2, 1)).rejects.toThrow('API error 500: Server Error');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should use exponential backoff (delay doubles each retry)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('API error 503: Unavailable'))
      .mockRejectedValueOnce(new Error('API error 503: Unavailable'))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, 3, 100);

    // After 99ms, only 1 attempt should have happened
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);

    // After 100ms (1st retry delay), 2nd attempt fires
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    // After 200ms more (2nd retry delay = 100*2^1), 3rd attempt fires
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should work with maxRetries = 0 (no retries)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('API error 500: fail'));

    await expect(withRetry(fn, 0, 10)).rejects.toThrow('API error 500: fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
