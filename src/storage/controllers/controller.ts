import type { Request, Response } from "express";
import { logger } from "#modules/runtime_logs.js";
import { generateUploadUrl } from "#modules/s3_client.js";
import type { CustomRequest } from "#core/validator.js";
import type { UploadUrlInput } from "../schemas/schema.js";

const MEDIA_CONFIG: Record<
  "audio" | "cover",
  { prefix: string; ext: string; contentType: string }
> = {
  audio: { prefix: "audio", ext: "mp3", contentType: "audio/mpeg" },
  cover: { prefix: "covers", ext: "png", contentType: "image/png" },
};

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
      const payload =
        (req as CustomRequest<UploadUrlInput>).validated ??
        (req.body as UploadUrlInput);
      const { type, contentType, extension } = payload;
      const config = MEDIA_CONFIG[type] ?? MEDIA_CONFIG.cover;
      const result = await generateUploadUrl(
        config.prefix,
        extension || config.ext,
        contentType || config.contentType,
      );

      logger.info("Presigned upload URL generated", {
        type,
        key: result.key,
      });

      return res.status(200).json(result);
    } catch (err: unknown) {
      logger.error("Failed to generate presigned upload URL", { error: err });
      return res
        .status(500)
        .json({ error: "Failed to generate upload presigned URL" });
    }
  },
};
