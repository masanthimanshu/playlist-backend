import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { storageController } from "./controller.js";
import * as s3Client from "#modules/s3_client.js";

vi.mock("#modules/s3_client.js");
vi.mock("#modules/runtime_logs.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("storageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  describe("healthCheck", () => {
    it("should return status ok and a valid timestamp", () => {
      const mockReq = {
        path: "/storage/health",
      } as unknown as Request;
      const res = mockResponse();

      storageController.healthCheck(mockReq, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledOnce();
      const responsePayload = vi.mocked(res.json).mock.calls[0][0];
      expect(responsePayload.status).toBe("ok");
      expect(responsePayload.timestamp).toBeDefined();
    });
  });

  describe("getUploadUrl", () => {
    it("generates presigned upload URL for audio (.mp3) via query parameters", async () => {
      const req = {
        query: { type: "audio", contentType: "audio/mpeg", extension: "mp3" },
      } as unknown as Request;
      const res = mockResponse();

      vi.spyOn(s3Client, "generateUploadUrl").mockResolvedValue({
        uploadUrl: "https://s3.amazonaws.com/upload-audio",
        key: "audio/123.mp3",
        cdnUrl: "https://cdn.example.com/audio/123.mp3",
      });

      await storageController.getUploadUrl(req, res);

      expect(s3Client.generateUploadUrl).toHaveBeenCalledWith(
        "audio",
        "mp3",
        "audio/mpeg",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        uploadUrl: "https://s3.amazonaws.com/upload-audio",
        key: "audio/123.mp3",
        cdnUrl: "https://cdn.example.com/audio/123.mp3",
      });
    });

    it("generates presigned upload URL for cover (.png) via body or query defaults", async () => {
      const req = {
        query: { type: "cover" },
      } as unknown as Request;
      const res = mockResponse();

      vi.spyOn(s3Client, "generateUploadUrl").mockResolvedValue({
        uploadUrl: "https://s3.amazonaws.com/upload-cover",
        key: "covers/456.png",
        cdnUrl: "https://cdn.example.com/covers/456.png",
      });

      await storageController.getUploadUrl(req, res);

      expect(s3Client.generateUploadUrl).toHaveBeenCalledWith(
        "covers",
        "png",
        "image/png",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles S3 errors gracefully with 500 status", async () => {
      const req = { body: { type: "audio" } } as Request;
      const res = mockResponse();

      vi.spyOn(s3Client, "generateUploadUrl").mockRejectedValue(
        new Error("S3 Service Unavailable"),
      );

      await storageController.getUploadUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to generate upload presigned URL",
      });
    });
  });
});
