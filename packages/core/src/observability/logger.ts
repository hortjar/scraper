import { HashMap, Layer, List, Logger, LogLevel, type LogLevel as LogLevelType } from "effect"

import { REDACTED_KEYS } from "../constants/telemetry.js"

const redactedSet = new Set<string>(REDACTED_KEYS.map((key) => key.toLowerCase()))

const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 4) return "[deep]"
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = redactedSet.has(key.toLowerCase()) ? "[redacted]" : redact(item, depth + 1)
  }
  return output
}

export const jsonLogger = Logger.make(({ logLevel, message, annotations, spans, date }) => {
  const entry: Record<string, unknown> = {
    level: logLevel.label.toLowerCase(),
    time: date.toISOString(),
    message: Array.isArray(message) ? message.map(String).join(" ") : String(message),
  }
  for (const [key, value] of HashMap.toEntries(annotations)) {
    entry[key] = redact(value)
  }
  const spanNames = List.toArray(spans).map((span) => span.label)
  if (spanNames.length > 0) entry["spans"] = spanNames
  globalThis.console.log(JSON.stringify(entry))
})

export const loggerLayer = (
  format: "json" | "pretty",
  level: string,
): Layer.Layer<never> =>
  Layer.merge(
    format === "json" ? Logger.replace(Logger.defaultLogger, jsonLogger) : Logger.pretty,
    Logger.minimumLogLevel(parseLevel(level)),
  )

const LEVELS: Record<string, LogLevelType.LogLevel> = {
  trace: LogLevel.Trace,
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warning,
  warning: LogLevel.Warning,
  error: LogLevel.Error,
  fatal: LogLevel.Fatal,
  none: LogLevel.None,
}

export const parseLevel = (value: string): LogLevelType.LogLevel =>
  LEVELS[value.toLowerCase()] ?? LogLevel.Info
