import type { Request, Response } from "express";
import { logger } from "#modules/runtime_logs.js";
import { generateUploadUrl } from "#modules/s3_client.js";
import type { UploadUrlInput } from "../schemas/schema.js";

export const storageController = {
  /**
   * Health check handler to verify storage service availability.
   */
  healthCheck(req: Request, res: Response): Response {
    logger.info("Health check requested", { path: req.path });
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Generates an S3 presigned PUT URL for media file direct upload.
   */
  async getUploadUrl(req: Request, res: Response): Promise<Response> {
    try {
      const { type, contentType, extension } = req.body as UploadUrlInput;

      let prefix = "covers";
      let defaultExt = "png";
      let defaultContentType = "image/png";

      if (type === "audio") {
        prefix = "audio";
        defaultExt = "mp3";
        defaultContentType = "audio/mpeg";
      }

      const ext = extension || defaultExt;
      const mime = contentType || defaultContentType;

      const result = await generateUploadUrl(prefix, ext, mime);

      logger.info("Presigned upload URL generated", {
        type,
        key: result.key,
      });

      return res.status(200).json(result);
    } catch (err: unknown) {
      logger.error("Failed to generate presigned upload URL", {
        error: err instanceof Error ? err.message : String(err),
      });
      return res
        .status(500)
        .json({ error: "Failed to generate upload presigned URL" });
    }
  },
};
