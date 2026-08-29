import "dotenv/config";
import express, {
  type Express,
  type Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { logger } from "#modules/runtime_logs.js";

export default function createApp(baseUrl: string, routes: Router): Express {
  const app = express();

  app.use(express.json());

  // Handle invalid JSON body syntax errors
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      logger.error("Malformed JSON payload", {
        error: err.message,
      });
      res.status(400).json({ error: "Invalid JSON payload" });
      return;
    }
    next(err);
  });

  app.use(baseUrl, routes);

  // Fallback 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found", path: req.originalUrl });
  });

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Internal server error", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}
