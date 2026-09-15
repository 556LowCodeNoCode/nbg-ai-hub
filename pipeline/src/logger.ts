// logger.ts — NF6 structured stdout logging.
// See project-design.md §3.13.

export type Logger = {
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
  error: (event: string, fields?: Record<string, unknown>) => void;
};

export function makeLogger(stream: NodeJS.WritableStream = process.stdout): Logger {
  function emit(level: "INFO" | "WARN" | "ERROR", event: string, fields?: Record<string, unknown>): void {
    const payload = fields ? JSON.stringify(fields) : "{}";
    const line = `${level}  ${event}  ${payload}\n`;
    stream.write(line);
    if (level === "WARN") {
      stream.write(`::warning::${event} ${payload}\n`);
    } else if (level === "ERROR") {
      stream.write(`::error::${event} ${payload}\n`);
    }
  }

  return {
    info: (event, fields) => emit("INFO", event, fields),
    warn: (event, fields) => emit("WARN", event, fields),
    error: (event, fields) => emit("ERROR", event, fields),
  };
}
