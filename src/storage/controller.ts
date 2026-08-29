import type { Request, Response } from "express";
import { logger } from "#modules/runtime_logs.js";

export const storageController = {
  /**
   * Basic health check handler to verify service availability.
   */
  healthCheck(req: Request, res: Response): Response {
    logger.info("Health check requested", { path: req.path });
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  },
};
