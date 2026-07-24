export const QUEUE = {
  scrape: "scrape",
  notify: "notify",
  digest: "digest",
  maintenance: "maintenance",
} as const

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE]

export const JOB_NAME = {
  scrape: "scrape",
  notify: "notify",
  digest: "digest",
  reconcileSchedules: "reconcile-schedules",
  sweepRuns: "sweep-runs",
  sweepSessions: "sweep-sessions",
  refreshStats: "refresh-stats",
  pruneRobots: "prune-robots",
  heartbeat: "heartbeat",
} as const

export type JobName = (typeof JOB_NAME)[keyof typeof JOB_NAME]

export const MAINTENANCE_TASK = {
  reconcileSchedules: JOB_NAME.reconcileSchedules,
  sweepRuns: JOB_NAME.sweepRuns,
  sweepSessions: JOB_NAME.sweepSessions,
  refreshStats: JOB_NAME.refreshStats,
  pruneRobots: JOB_NAME.pruneRobots,
  heartbeat: JOB_NAME.heartbeat,
} as const

export type MaintenanceTask = (typeof MAINTENANCE_TASK)[keyof typeof MAINTENANCE_TASK]

export const SCHEDULER_ID = {
  monitor: (monitorId: string) => `monitor:${monitorId}`,
  digestRule: (ruleId: string) => `digest:${ruleId}`,
  maintenance: (task: MaintenanceTask) => `maintenance:${task}`,
} as const
