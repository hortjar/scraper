export const HEALTH_STATUS = {
  ok: "ok",
} as const

export const READY_STATUS = {
  ok: "ok",
  unhealthy: "unhealthy",
} as const

export const PROBE_NAME = {
  database: "database",
  redis: "redis",
} as const

export const SYSTEM_OPERATION_ID = {
  getHealth: "getHealth",
  getReadiness: "getReadiness",
  getMetrics: "getMetrics",
  getMeta: "getMeta",
} as const
