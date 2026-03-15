import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            message: 'Validation failed',
            details: error.issues.map((e) => ({
              path: e.path.map(String).join('.'),
              message: e.message,
            })),
          },
        });
        return;
      }
      next(error);
    }
  };
}

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

/** Validate that :id or :poolId param is a valid MongoDB ObjectId */
export function validateObjectId(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName] as string | undefined;
    if (!value || !OBJECT_ID_RE.test(value)) {
      res.status(400).json({
        error: { message: `Invalid ${paramName}: must be a 24-character hex string` },
      });
      return;
    }
    next();
  };
}
