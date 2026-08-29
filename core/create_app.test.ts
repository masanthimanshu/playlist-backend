import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { Router } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import createApp from "./create_app.js";

vi.mock("#modules/runtime_logs.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("createApp factory", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const testRouter = Router();
    testRouter.get("/ping", (_req, res) => {
      res.json({ message: "pong" });
    });
    testRouter.post("/echo", (req, res) => {
      res.json({ data: req.body });
    });
    testRouter.get("/error", () => {
      throw new Error("Simulated server failure");
    });

    const app = createApp("/api", testRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });

    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("handles standard GET requests on the mounted router", async () => {
    const res = await fetch(`${baseUrl}/api/ping`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ message: "pong" });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("handles OPTIONS preflight requests with 204 No Content", async () => {
    const res = await fetch(`${baseUrl}/api/ping`, {
      method: "OPTIONS",
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("parses valid JSON POST requests", async () => {
    const payload = { test: 123 };
    const res = await fetch(`${baseUrl}/api/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ data: payload });
  });

  it("returns 400 for malformed JSON request bodies", async () => {
    const res = await fetch(`${baseUrl}/api/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ malformed json",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Invalid JSON payload" });
  });

  it("returns 404 for unmapped endpoints", async () => {
    const res = await fetch(`${baseUrl}/unknown-path`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Not Found");
    expect(data.path).toBe("/unknown-path");
  });

  it("returns 500 for unhandled exceptions in routes", async () => {
    const res = await fetch(`${baseUrl}/api/error`);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ error: "Internal Server Error" });
  });
});
