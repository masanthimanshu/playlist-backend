import { z } from "zod";

export const UploadUrlSchema = z.object({
  type: z.enum(["audio", "cover"]),
  contentType: z.string().optional(),
  extension: z.string().optional(),
});

export type UploadUrlInput = z.infer<typeof UploadUrlSchema>;

export type { GenerateUploadUrlResult } from "#modules/s3_client.js";
