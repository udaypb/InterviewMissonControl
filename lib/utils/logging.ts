type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload = context ? ` ${JSON.stringify(context)}` : "";
  console[level](`[mission-control] ${message}${payload}`);
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  log("info", message, context);
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  log("warn", message, context);
}

export function logError(message: string, context?: Record<string, unknown>) {
  log("error", message, context);
}
