import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveCdnUrl, generateUploadUrl } from "./s3_client.js";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.signed.url/test"),
}));

describe("s3Client module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("resolveCdnUrl", () => {
    it("returns empty string when given empty input", () => {
      expect(resolveCdnUrl("")).toBe("");
    });

    it("returns direct URL if already full http/https", () => {
      expect(resolveCdnUrl("https://example.com/audio.mp3")).toBe(
        "https://example.com/audio.mp3",
      );
      expect(resolveCdnUrl("http://example.com/audio.mp3")).toBe(
        "http://example.com/audio.mp3",
      );
    });

    it("resolves key with CLOUDFRONT_DOMAIN when configured", () => {
      process.env.CLOUDFRONT_DOMAIN = "https://d12345.cloudfront.net/";
      expect(resolveCdnUrl("audio/track.mp3")).toBe(
        "https://d12345.cloudfront.net/audio/track.mp3",
      );
    });

    it("falls back to S3 URL when CLOUDFRONT_DOMAIN is not configured", () => {
      delete process.env.CLOUDFRONT_DOMAIN;
      process.env.BUCKET_NAME = "my-bucket";
      process.env.CURRENT_AWS_REGION = "ap-south-1";

      expect(resolveCdnUrl("covers/cover.png")).toBe(
        "https://my-bucket.s3.ap-south-1.amazonaws.com/covers/cover.png",
      );
      expect(resolveCdnUrl("/covers/cover.png")).toBe(
        "https://my-bucket.s3.ap-south-1.amazonaws.com/covers/cover.png",
      );
    });
  });

  describe("generateUploadUrl", () => {
    it("generates presigned upload URL and CDN URL for audio", async () => {
      process.env.CLOUDFRONT_DOMAIN = "cdn.example.com";
      const result = await generateUploadUrl(
        "audio",
        "mp3",
        "audio/mpeg",
        "meta-string",
      );

      expect(result.uploadUrl).toBe("https://s3.signed.url/test");
      expect(result.key).toMatch(/^audio\/[a-f0-9-]+\.mp3$/);
      expect(result.cdnUrl).toMatch(
        /^https:\/\/cdn\.example\.com\/audio\/[a-f0-9-]+\.mp3$/,
      );
    });

    it("generates presigned upload URL with dot-prefixed extension and json metadata", async () => {
      process.env.CLOUDFRONT_DOMAIN = "cdn.example.com";
      const result = await generateUploadUrl("covers", ".png", "image/png", {
        tag: "album",
      });

      expect(result.key).toMatch(/^covers\/[a-f0-9-]+\.png$/);
    });
  });
});
