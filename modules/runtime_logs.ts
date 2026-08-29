type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

function serializeError(err: Error): SerializedError {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function formatData(data?: unknown): Record<string, unknown> {
  if (!data) return {};
  if (data instanceof Error) return { error: serializeError(data) };
  if (typeof data === "object") {
    const formatted: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
    };
    if (formatted.error instanceof Error) {
      formatted.error = serializeError(formatted.error);
    }
    return formatted;
  }
  return { detail: data };
}

function log(
  level: LogLevel,
  writer: (message?: unknown) => void,
  msg: string,
  data?: unknown,
): void {
  writer(
    JSON.stringify({
      level,
      time: new Date().toISOString(),
      message: msg,
      ...formatData(data),
    }),
  );
}

export const logger = {
  info: (msg: string, data?: unknown) => log("INFO", console.log, msg, data),
  warn: (msg: string, data?: unknown) => log("WARN", console.warn, msg, data),
  error: (msg: string, data?: unknown) =>
    log("ERROR", console.error, msg, data),
  debug: (msg: string, data?: unknown) =>
    log("DEBUG", console.debug, msg, data),
};
