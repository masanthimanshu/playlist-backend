import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { tracksController } from "./controller.js";
import * as dynamoClient from "#modules/dynamo_client.js";
import * as s3Client from "#modules/s3_client.js";

vi.mock("#modules/dynamo_client.js");
vi.mock("#modules/s3_client.js");
vi.mock("#modules/runtime_logs.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("tracksController (DynamoDB Domain)", () => {
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
    it("returns status ok and a valid timestamp", () => {
      const req = {
        path: "/tracks/health",
      } as unknown as Request;
      const res = mockResponse();

      tracksController.healthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledOnce();
      const payload = vi.mocked(res.json).mock.calls[0][0];
      expect(payload.status).toBe("ok");
      expect(payload.timestamp).toBeDefined();
    });
  });

  describe("getTracks", () => {
    it("returns list of tracks with resolved CDN URLs", async () => {
      const req = {} as Request;
      const res = mockResponse();

      const mockData = [
        {
          id: "1",
          title: "Track 1",
          artist: ["Artist A"],
          category: "Pop",
          audioUrl: "audio/1.mp3",
          coverUrl: "covers/1.png",
          timestamp: "2026-08-29T10:00:00.000Z",
        },
        {
          id: "2",
          title: "Track 2",
          artist: ["Artist B", "Featured C"],
          category: "Rock",
          audioUrl: "audio/2.mp3",
          coverUrl: "covers/2.png",
          timestamp: "2026-08-29T11:00:00.000Z",
        },
      ];

      vi.spyOn(dynamoClient, "listData").mockResolvedValue(mockData);
      vi.spyOn(s3Client, "resolveCdnUrl").mockImplementation(
        (key) => `https://cdn.example.com/${key}`,
      );

      await tracksController.getTracks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          id: "2",
          title: "Track 2",
          artist: ["Artist B", "Featured C"],
          category: "Rock",
          audioUrl: "https://cdn.example.com/audio/2.mp3",
          coverUrl: "https://cdn.example.com/covers/2.png",
          timestamp: "2026-08-29T11:00:00.000Z",
        },
        {
          id: "1",
          title: "Track 1",
          artist: ["Artist A"],
          category: "Pop",
          audioUrl: "https://cdn.example.com/audio/1.mp3",
          coverUrl: "https://cdn.example.com/covers/1.png",
          timestamp: "2026-08-29T10:00:00.000Z",
        },
      ]);
    });

    it("handles errors when DynamoDB scan fails", async () => {
      const req = {} as Request;
      const res = mockResponse();

      vi.spyOn(dynamoClient, "listData").mockRejectedValue(
        new Error("Scan failed"),
      );

      await tracksController.getTracks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve tracks",
      });
    });
  });

  describe("getTrackById", () => {
    it("returns track when found in DynamoDB", async () => {
      const req = { params: { id: "track-123" } } as unknown as Request;
      const res = mockResponse();

      const mockTrack = {
        id: "track-123",
        title: "Sunset Vibes",
        artist: ["Luna"],
        category: "Lo-Fi",
        audioUrl: "audio/track-123.mp3",
        coverUrl: "covers/track-123.png",
        timestamp: "2026-08-29T10:00:00.000Z",
      };

      vi.spyOn(dynamoClient, "getData").mockResolvedValue(mockTrack);
      vi.spyOn(s3Client, "resolveCdnUrl").mockImplementation(
        (key) => `https://cdn.example.com/${key}`,
      );

      await tracksController.getTrackById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockTrack,
        audioUrl: "https://cdn.example.com/audio/track-123.mp3",
        coverUrl: "https://cdn.example.com/covers/track-123.png",
      });
    });

    it("returns 404 when track is not found in DynamoDB", async () => {
      const req = { params: { id: "non-existent" } } as unknown as Request;
      const res = mockResponse();

      vi.spyOn(dynamoClient, "getData").mockResolvedValue(null);

      await tracksController.getTrackById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Track not found" });
    });

    it("returns 400 when ID param is missing", async () => {
      const req = { params: {} } as unknown as Request;
      const res = mockResponse();

      await tracksController.getTrackById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Track ID is required" });
    });

    it("returns 500 when getData fails", async () => {
      const req = { params: { id: "track-err" } } as unknown as Request;
      const res = mockResponse();

      vi.spyOn(dynamoClient, "getData").mockRejectedValue(
        new Error("DB Error"),
      );

      await tracksController.getTrackById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve track",
      });
    });
  });

  describe("createTrack", () => {
    it("persists a new track to DynamoDB with artist array", async () => {
      const req = {
        body: {
          title: "Electric Dreams",
          artist: ["Daft Punk", "Pharrell"],
          category: "Electronic",
          audioUrl: "audio/synth.mp3",
          coverUrl: "covers/cover.png",
        },
      } as Request;
      const res = mockResponse();

      vi.spyOn(s3Client, "resolveCdnUrl").mockImplementation(
        (key) => `https://cdn.example.com/${key}`,
      );

      const createdRecord = {
        id: "new-uuid",
        title: "Electric Dreams",
        artist: ["Daft Punk", "Pharrell"],
        category: "Electronic",
        audioUrl: "https://cdn.example.com/audio/synth.mp3",
        coverUrl: "https://cdn.example.com/covers/cover.png",
        timestamp: "2026-08-29T12:00:00.000Z",
      };

      vi.spyOn(dynamoClient, "writeData").mockResolvedValue(createdRecord);

      await tracksController.createTrack(req, res);

      expect(dynamoClient.writeData).toHaveBeenCalledWith({
        title: "Electric Dreams",
        artist: ["Daft Punk", "Pharrell"],
        category: "Electronic",
        audioUrl: "https://cdn.example.com/audio/synth.mp3",
        coverUrl: "https://cdn.example.com/covers/cover.png",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdRecord);
    });

    it("persists a new track with single string artist converted to array", async () => {
      const req = {
        body: {
          title: "Solo Song",
          artist: "Single Artist",
          category: "Acoustic",
          audioUrl: "audio/solo.mp3",
          coverUrl: "covers/solo.png",
        },
      } as unknown as Request;
      const res = mockResponse();

      vi.spyOn(s3Client, "resolveCdnUrl").mockImplementation(
        (key) => `https://cdn.example.com/${key}`,
      );

      const createdRecord = {
        id: "solo-uuid",
        title: "Solo Song",
        artist: ["Single Artist"],
        category: "Acoustic",
        audioUrl: "https://cdn.example.com/audio/solo.mp3",
        coverUrl: "https://cdn.example.com/covers/solo.png",
        timestamp: "2026-08-29T12:00:00.000Z",
      };

      vi.spyOn(dynamoClient, "writeData").mockResolvedValue(createdRecord);

      await tracksController.createTrack(req, res);

      expect(dynamoClient.writeData).toHaveBeenCalledWith({
        title: "Solo Song",
        artist: ["Single Artist"],
        category: "Acoustic",
        audioUrl: "https://cdn.example.com/audio/solo.mp3",
        coverUrl: "https://cdn.example.com/covers/solo.png",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdRecord);
    });

    it("returns 500 when writeData fails", async () => {
      const req = {
        body: {
          title: "Fail Track",
          artist: ["Artist"],
          category: "Pop",
          audioUrl: "audio/fail.mp3",
          coverUrl: "covers/fail.png",
        },
      } as Request;
      const res = mockResponse();

      vi.spyOn(dynamoClient, "writeData").mockRejectedValue(
        new Error("Write failed"),
      );

      await tracksController.createTrack(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to create track",
      });
    });
  });

  describe("deleteTrack", () => {
    it("deletes a track from DynamoDB and returns success message", async () => {
      const req = { params: { id: "track-123" } } as unknown as Request;
      const res = mockResponse();

      vi.spyOn(dynamoClient, "deleteData").mockResolvedValue(true);

      await tracksController.deleteTrack(req, res);

      expect(dynamoClient.deleteData).toHaveBeenCalledWith("track-123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Track deleted successfully",
        id: "track-123",
      });
    });

    it("returns 400 when ID param is missing", async () => {
      const req = { params: {} } as unknown as Request;
      const res = mockResponse();

      await tracksController.deleteTrack(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Track ID is required" });
    });

    it("returns 500 when deleteData fails", async () => {
      const req = { params: { id: "track-123" } } as unknown as Request;
      const res = mockResponse();

      vi.spyOn(dynamoClient, "deleteData").mockRejectedValue(
        new Error("Delete failed"),
      );

      await tracksController.deleteTrack(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to delete track",
      });
    });
  });
});
