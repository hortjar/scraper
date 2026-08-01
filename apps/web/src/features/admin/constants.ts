export const LOG_LEVEL = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
} as const

export const LOG_SERVICE = { api: "api", worker: "worker" } as const

export const LOG_SOURCE = { stream: "stream", persisted: "persisted" } as const

export const ALL_VALUE = "all"
