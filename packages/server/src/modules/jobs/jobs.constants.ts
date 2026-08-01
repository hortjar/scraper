import { MAINTENANCE_TASK, type MaintenanceTask } from "@scraper/core/constants"

export const RATE_LIMIT_WINDOW_MS = 60_000

export const FNV_OFFSET_BASIS = 0x81_1c_9d_c5
export const FNV_PRIME = 0x01_00_01_93

export const SCRAPE_JOB_RETENTION = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86_400 },
} as const

export const NOTIFY_JOB_RETENTION = {
  removeOnComplete: { age: 3600, count: 2000 },
  removeOnFail: { age: 86_400 },
} as const

export const DIGEST_JOB_RETENTION = {
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 86_400 },
} as const

export const MAINTENANCE_JOB_RETENTION = {
  removeOnComplete: { age: 3600, count: 200 },
  removeOnFail: { age: 604_800 },
} as const

export const NOTIFY_MAX_ATTEMPTS = 5
export const DIGEST_MAX_ATTEMPTS = 3
export const MAINTENANCE_MAX_ATTEMPTS = 3
export const MAINTENANCE_BACKOFF_MS = 60_000

export const STALE_RUN_TIMEOUT_MS = 900_000
export interface CronScheduleSpec {
  readonly pattern: string
}

export interface IntervalScheduleSpec {
  readonly every: number
}

export type MaintenanceScheduleSpec = CronScheduleSpec | IntervalScheduleSpec

export const MAINTENANCE_SCHEDULE: Record<MaintenanceTask, MaintenanceScheduleSpec> = {
  [MAINTENANCE_TASK.reconcileSchedules]: { pattern: "0 * * * *" },
  [MAINTENANCE_TASK.sweepRuns]: { pattern: "0 3 * * *" },
  [MAINTENANCE_TASK.sweepSessions]: { pattern: "30 * * * *" },
  [MAINTENANCE_TASK.refreshStats]: { every: 300_000 },
  [MAINTENANCE_TASK.pruneRobots]: { pattern: "0 4 * * *" },
  [MAINTENANCE_TASK.drainLogs]: { every: 30_000 },
  [MAINTENANCE_TASK.heartbeat]: { every: 60_000 },
}

export const MAINTENANCE_SCHEDULE_TZ = "UTC"
