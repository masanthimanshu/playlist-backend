import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validateData, type CustomRequest } from "./validator.js";

describe("validateData middleware", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("should validate and forward valid request payload", () => {
    const validBody = { name: "Antigravity", age: 42 };
    const req = {
      body: validBody,
      path: "/test",
    } as unknown as CustomRequest;

    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateData(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.validated).toEqual(validBody);
    expect(req.body).toEqual(validBody);
  });

  it("should return HTTP 400 when payload is invalid", () => {
    const invalidBody = { name: "", age: -5 };
    const req = {
      body: invalidBody,
      path: "/test",
    } as unknown as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateData(schema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        details: expect.any(Array),
      }),
    );
  });
});
