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
  cdnUrl: string;
}

/**
 * Resolves an S3 key to a CloudFront CDN URL (or S3 HTTPS URL fallback).
 */
export function resolveCdnUrl(keyOrUrl: string): string {
  if (!keyOrUrl) return "";
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
    return keyOrUrl;
  }

  const cleanKey = keyOrUrl.startsWith("/") ? keyOrUrl.slice(1) : keyOrUrl;
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;

  if (cdnDomain && cdnDomain.trim() !== "") {
    const domain = cdnDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${domain}/${cleanKey}`;
  }

  const bucket = process.env.BUCKET_NAME || "playlist-backend-assets-bucket";
  const region = process.env.CURRENT_AWS_REGION || "ap-south-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
}

/**
 * Generates an S3 presigned PUT URL for direct client upload and returns CDN URL.
 */
export async function generateUploadUrl(
  prefix: string,
  ext: string,
  contentType: string,
  data?: unknown,
  expiresIn = 300,
): Promise<GenerateUploadUrlResult> {
  const cleanExt = ext.replace(/^\./, "");
  const key = `${prefix}/${randomUUID()}.${cleanExt}`;

  const command = new PutObjectCommand({
    Key: key,
    Metadata: formatMetadata(data),
    ContentType: contentType,
    Bucket: process.env.BUCKET_NAME,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const cdnUrl = resolveCdnUrl(key);

  return { uploadUrl, key, cdnUrl };
}

export const generateCoverUploadUrl = (
  contentType = "image/png",
  ext = "png",
  data?: unknown,
): Promise<GenerateUploadUrlResult> =>
  generateUploadUrl("covers", ext, contentType, data);

export const generateAudioUploadUrl = (
  contentType = "audio/mpeg",
  ext = "mp3",
  data?: unknown,
): Promise<GenerateUploadUrlResult> =>
  generateUploadUrl("audio", ext, contentType, data);
