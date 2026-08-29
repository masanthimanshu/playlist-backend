import { randomUUID } from "node:crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.CURRENT_AWS_REGION });

function formatMetadata(data?: unknown): Record<string, string> | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return { data };
  return { data: JSON.stringify(data) };
}

export interface GenerateUploadUrlResult {
  uploadUrl: string;
  key: string;
}

/**
 * Generates an S3 presigned PUT URL for direct client upload.
 */
export async function generateUploadUrl(
  prefix: string,
  ext: string,
  contentType: string,
  data?: unknown,
  expiresIn = 300,
): Promise<GenerateUploadUrlResult> {
  const key = `${prefix}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Key: key,
    Metadata: formatMetadata(data),
    ContentType: contentType,
    Bucket: process.env.BUCKET_NAME,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { uploadUrl, key };
}

export const generateImageUploadUrl = (
  data?: unknown,
): Promise<GenerateUploadUrlResult> =>
  generateUploadUrl("images", "webp", "image/webp", data);

export const generateAudioUploadUrl = (
  data?: unknown,
): Promise<GenerateUploadUrlResult> =>
  generateUploadUrl("audio", "mp3", "audio/mpeg", data);
