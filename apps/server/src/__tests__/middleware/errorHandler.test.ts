import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandler } from '../../middleware/errorHandler';
import type { Request, Response, NextFunction } from 'express';

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('errorHandler', () => {
  const req = {} as Request;
  const next = vi.fn() as NextFunction;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return 500 by default for standard errors', () => {
    const res = createMockRes();
    const error = new Error('Something went wrong');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Something went wrong',
        }),
      })
    );
  });

  it('should use statusCode from error if available', () => {
    const res = createMockRes();
    const error = Object.assign(new Error('Not Found'), { statusCode: 404 });

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Not Found' }),
      })
    );
  });

  it('should include stack trace in non-production', () => {
    process.env.NODE_ENV = 'development';
    const res = createMockRes();
    const error = new Error('Debug error');

    errorHandler(error, req, res, next);

    const jsonBody = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonBody.error.stack).toBeDefined();
    expect(jsonBody.error.stack).toContain('Debug error');
  });

  it('should NOT include stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const res = createMockRes();
    const error = new Error('Prod error');

    errorHandler(error, req, res, next);

    const jsonBody = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonBody.error.stack).toBeUndefined();
  });

  it('should log error with stack', async () => {
    const res = createMockRes();
    const error = new Error('Logged error');

    errorHandler(error, req, res, next);

    const { logger } = await import('../../lib/logger');
    expect(logger.error).toHaveBeenCalledWith('Logged error', { stack: error.stack });
  });

  it('should fallback to "Internal Server Error" for empty message', () => {
    const res = createMockRes();
    const error = new Error('');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonBody = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // Empty string is falsy, so falls back to 'Internal Server Error'
    expect(jsonBody.error.message).toBe('Internal Server Error');
  });
});
