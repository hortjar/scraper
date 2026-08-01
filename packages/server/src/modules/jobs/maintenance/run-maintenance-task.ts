import { MAINTENANCE_TASK } from "@scraper/core/constants"
import { Match } from "effect"

import { drainLogs } from "../../logs/index.js"
import type { MaintenanceJobPayload } from "../jobs.schema.js"

import { pruneRobots } from "./prune-robots.js"
import { reconcileSchedules } from "./reconcile-schedules.js"
import { refreshStats } from "./refresh-stats.js"
import { schedulerHealth } from "./scheduler-health.js"
import { sweepRuns } from "./sweep-runs.js"
import { sweepSessions } from "./sweep-sessions.js"

export const runMaintenanceTask = (payload: MaintenanceJobPayload) =>
  Match.value(payload.task).pipe(
    Match.when(MAINTENANCE_TASK.reconcileSchedules, () => reconcileSchedules()),
    Match.when(MAINTENANCE_TASK.drainLogs, () => drainLogs()),
    Match.when(MAINTENANCE_TASK.sweepRuns, () => sweepRuns()),
    Match.when(MAINTENANCE_TASK.sweepSessions, () => sweepSessions()),
    Match.when(MAINTENANCE_TASK.refreshStats, () => refreshStats()),
    Match.when(MAINTENANCE_TASK.pruneRobots, () => pruneRobots()),
    Match.when(MAINTENANCE_TASK.heartbeat, () => schedulerHealth()),
    Match.exhaustive,
  )
