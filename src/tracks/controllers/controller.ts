import type { Request, Response } from "express";
import { logger } from "#modules/runtime_logs.js";
import {
  listData,
  getData,
  writeData,
  deleteData,
} from "#modules/dynamo_client.js";
import { resolveCdnUrl } from "#modules/s3_client.js";
import type { CreateTrackInput, Track } from "../schemas/schema.js";

function getParamId(req: Request): string | undefined {
  const param = req.params.id;
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : String(param);
}

export const tracksController = {
  /**
   * Health check handler to verify tracks service availability.
   */
  healthCheck(req: Request, res: Response): Response {
    logger.info("Tracks health check requested", { path: req.path });
    return res.status(200).json({
      status: "ok",
      service: "tracks",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Fetches all tracks from DynamoDB.
   */
  async getTracks(_req: Request, res: Response): Promise<Response> {
    try {
      const rawTracks = await listData<Track>();

      const tracks = rawTracks
        .map((t) => ({
          ...t,
          audioUrl: resolveCdnUrl(t.audioUrl),
          coverUrl: resolveCdnUrl(t.coverUrl),
        }))
        .sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });

      logger.info("Fetched tracks list from DynamoDB", { count: tracks.length });
      return res.status(200).json(tracks);
    } catch (err: unknown) {
      logger.error("Failed to fetch tracks from DynamoDB", {
        error: err instanceof Error ? err.message : String(err),
      });
      return res.status(500).json({ error: "Failed to retrieve tracks" });
    }
  },

  /**
   * Fetches a single track by its unique ID from DynamoDB.
   */
  async getTrackById(req: Request, res: Response): Promise<Response> {
    try {
      const id = getParamId(req);
      if (!id) {
        return res.status(400).json({ error: "Track ID is required" });
      }

      const track = await getData<Track>(id);
      if (!track) {
        logger.warn("Track not found in DynamoDB", { id });
        return res.status(404).json({ error: "Track not found" });
      }

      const formattedTrack: Track = {
        ...track,
        audioUrl: resolveCdnUrl(track.audioUrl),
        coverUrl: resolveCdnUrl(track.coverUrl),
      };

      return res.status(200).json(formattedTrack);
    } catch (err: unknown) {
      logger.error("Failed to fetch track by ID from DynamoDB", {
        id: req.params.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return res.status(500).json({ error: "Failed to retrieve track" });
    }
  },

  /**
   * Pushes a new track record into DynamoDB.
   */
  async createTrack(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateTrackInput;

      const trackRecord = {
        title: payload.title,
        artist: Array.isArray(payload.artist) ? payload.artist : [payload.artist],
        category: payload.category,
        audioUrl: resolveCdnUrl(payload.audioUrl),
        coverUrl: resolveCdnUrl(payload.coverUrl),
      };

      const created = await writeData(trackRecord);

      logger.info("Track persisted to DynamoDB successfully", { id: created.id });
      return res.status(201).json(created);
    } catch (err: unknown) {
      logger.error("Failed to push track to DynamoDB", {
        error: err instanceof Error ? err.message : String(err),
      });
      return res.status(500).json({ error: "Failed to create track" });
    }
  },

  /**
   * Deletes a track by ID from DynamoDB.
   */
  async deleteTrack(req: Request, res: Response): Promise<Response> {
    try {
      const id = getParamId(req);
      if (!id) {
        return res.status(400).json({ error: "Track ID is required" });
      }

      await deleteData(id);
      logger.info("Track deleted from DynamoDB successfully", { id });
      return res.status(200).json({
        message: "Track deleted successfully",
        id,
      });
    } catch (err: unknown) {
      logger.error("Failed to delete track from DynamoDB", {
        id: req.params.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return res.status(500).json({ error: "Failed to delete track" });
    }
  },
};
