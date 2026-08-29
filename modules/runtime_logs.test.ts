import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "./runtime_logs.js";

describe("runtimeLogs module", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  it("logs structured info message", () => {
    logger.info("Server started", { port: 3000 });

    expect(logSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("INFO");
    expect(logged.message).toBe("Server started");
    expect(logged.port).toBe(3000);
    expect(logged.time).toBeDefined();
  });

  it("logs structured warn message", () => {
    logger.warn("Item not found", { id: "item-123" });

    expect(warnSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("WARN");
    expect(logged.message).toBe("Item not found");
    expect(logged.id).toBe("item-123");
  });

  it("logs structured error message with Error object and serialization", () => {
    const error = new Error("DB Connection failed");
    logger.error("Failed operation", error);

    expect(errorSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("ERROR");
    expect(logged.message).toBe("Failed operation");
    expect(logged.error.message).toBe("DB Connection failed");
    expect(logged.error.name).toBe("Error");
  });

  it("logs structured error with nested error property", () => {
    const error = new Error("Inner issue");
    logger.error("Context error", { context: "auth", error });

    expect(errorSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(logged.context).toBe("auth");
    expect(logged.error.message).toBe("Inner issue");
  });

  it("logs structured debug message and non-object data", () => {
    logger.debug("Debug value", "primitive-data");

    expect(debugSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(debugSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("DEBUG");
    expect(logged.detail).toBe("primitive-data");
  });

  it("logs without data payload", () => {
    logger.info("Simple notification");

    expect(logSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(logged.message).toBe("Simple notification");
  });
});
