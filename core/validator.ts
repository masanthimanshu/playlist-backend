import type { ZodType } from "zod";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "#modules/runtime_logs.js";

export interface CustomRequest<T = unknown> extends Request {
  validated?: T;
}

/**
 * Express middleware factory to validate request payload (body or query) against a Zod schema.
 */
export const validateData = <T>(schema: ZodType<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const isGetOrDelete = req.method === "GET" || req.method === "DELETE";
    const hasQuery = Boolean(req.query && Object.keys(req.query).length > 0);
    const hasBody = Boolean(req.body && Object.keys(req.body).length > 0);
    const dataToValidate = isGetOrDelete
      ? hasQuery
        ? req.query
        : req.body
      : hasBody
        ? req.body
        : req.query;

    const result = schema.safeParse(dataToValidate);

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

    (req as CustomRequest<T>).validated = result.data;
    if (isGetOrDelete) {
      req.query = result.data as unknown as Request["query"];
    }
    req.body = result.data;
    next();
  };
};
