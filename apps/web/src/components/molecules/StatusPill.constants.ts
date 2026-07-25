export const MONITOR_STATUS = {
  ok: "ok",
  degraded: "degraded",
  failing: "failing",
  paused: "paused",
} as const

export type MonitorStatus = (typeof MONITOR_STATUS)[keyof typeof MONITOR_STATUS]
