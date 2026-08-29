import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { storageController } from "./controller.js";

describe("storageController", () => {
  describe("healthCheck", () => {
    it("should return status ok and a valid timestamp", () => {
      const mockReq = {
        path: "/storage/health",
      } as unknown as Request;

      const jsonMock = vi.fn();
      const mockRes = {
        json: jsonMock,
      } as unknown as Response;

      storageController.healthCheck(mockReq, mockRes);

      expect(jsonMock).toHaveBeenCalledOnce();
      const responsePayload = jsonMock.mock.calls[0][0];
      expect(responsePayload.status).toBe("ok");
      expect(responsePayload.timestamp).toBeDefined();
      expect(new Date(responsePayload.timestamp).toString()).not.toBe(
        "Invalid Date",
      );
    });
  });
});
