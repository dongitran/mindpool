import { describe, it, expect, vi } from 'vitest';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

function createMockReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('validate middleware', () => {
  const schema = z.object({
    content: z.string().min(1).max(500),
    agentIds: z.array(z.string()).min(1).max(6).optional(),
  });

  it('should call next() when body is valid', () => {
    const { req, res, next } = createMockReqRes({ content: 'Hello' });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should parse and replace req.body with validated data', () => {
    const { req, res, next } = createMockReqRes({
      content: 'Hello',
      extraField: 'should be stripped',
    });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ content: 'Hello' });
    expect(req.body).not.toHaveProperty('extraField');
  });

  it('should return 400 when required field is missing', () => {
    const { req, res, next } = createMockReqRes({});

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ path: 'content' }),
          ]),
        }),
      })
    );
  });

  it('should return 400 when content is empty string', () => {
    const { req, res, next } = createMockReqRes({ content: '' });

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when content exceeds max length', () => {
    const { req, res, next } = createMockReqRes({ content: 'x'.repeat(501) });

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when content is wrong type', () => {
    const { req, res, next } = createMockReqRes({ content: 123 });

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when agentIds exceeds max', () => {
    const { req, res, next } = createMockReqRes({
      content: 'Hello',
      agentIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'],
    });

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should call next(error) for non-Zod errors', () => {
    // Create a schema that throws a non-Zod error
    const brokenSchema = {
      parse: () => { throw new Error('unexpected error'); },
    } as unknown as z.ZodSchema;

    const { req, res, next } = createMockReqRes({ content: 'Hello' });

    validate(brokenSchema)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should format multiple validation errors', () => {
    const strictSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    const { req, res, next } = createMockReqRes({ name: '', age: -1 });

    validate(strictSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.error.details.length).toBeGreaterThanOrEqual(2);
  });
});
