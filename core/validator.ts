import type { ZodType } from "zod";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "#modules/runtime_logs.js";

export interface CustomRequest<T = unknown> extends Request {
  validated?: T;
}

/**
 * Express middleware factory to validate request body against a Zod schema.
 */
export const validateData = <T>(schema: ZodType<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues;
      logger.error("Data validation failed", {
        path: req.path,
        issues,
      });
      res.status(400).json({
        error: "Validation failed",
        details: issues,
      });
      return;
    }

    req.body = result.data;
    (req as CustomRequest<T>).validated = result.data;
    next();
  };
};
