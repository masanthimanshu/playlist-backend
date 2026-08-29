import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  writeData,
  getData,
  listData,
  deleteData,
  docClient,
} from "./dynamo_client.js";

vi.mock("#modules/runtime_logs.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("dynamoClient module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("writeData", () => {
    it("writes an item to DynamoDB and returns item with generated id and timestamp", async () => {
      vi.spyOn(docClient, "send").mockResolvedValue({} as never);

      const result = await writeData({
        title: "Test Song",
        artist: ["Artist A"],
      });

      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.title).toBe("Test Song");
      expect(result.artist).toEqual(["Artist A"]);
    });

    it("throws error when docClient fails", async () => {
      vi.spyOn(docClient, "send").mockRejectedValue(new Error("Dynamo error"));

      await expect(writeData({ title: "Test" })).rejects.toThrow(
        "Dynamo error",
      );
    });
  });

  describe("getData", () => {
    it("returns item when found", async () => {
      const mockItem = { id: "item-1", title: "Test" };
      vi.spyOn(docClient, "send").mockResolvedValue({
        Item: mockItem,
      } as never);

      const result = await getData("item-1");
      expect(result).toEqual(mockItem);
    });

    it("returns null when item is not found", async () => {
      vi.spyOn(docClient, "send").mockResolvedValue({
        Item: undefined,
      } as never);

      const result = await getData("non-existent");
      expect(result).toBeNull();
    });

    it("throws error when get operation fails", async () => {
      vi.spyOn(docClient, "send").mockRejectedValue(new Error("Get failed"));

      await expect(getData("item-err")).rejects.toThrow("Get failed");
    });
  });

  describe("listData", () => {
    it("returns list of items from table scan", async () => {
      const mockItems = [{ id: "1" }, { id: "2" }];
      vi.spyOn(docClient, "send").mockResolvedValue({
        Items: mockItems,
      } as never);

      const result = await listData();
      expect(result).toEqual(mockItems);
    });

    it("throws error when scan operation fails", async () => {
      vi.spyOn(docClient, "send").mockRejectedValue(new Error("Scan failed"));

      await expect(listData()).rejects.toThrow("Scan failed");
    });
  });

  describe("deleteData", () => {
    it("deletes an item by id", async () => {
      vi.spyOn(docClient, "send").mockResolvedValue({} as never);

      const result = await deleteData("item-1");
      expect(result).toBe(true);
    });

    it("throws error when delete operation fails", async () => {
      vi.spyOn(docClient, "send").mockRejectedValue(new Error("Delete failed"));

      await expect(deleteData("item-err")).rejects.toThrow("Delete failed");
    });
  });
});
