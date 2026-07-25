import { MAINTENANCE_TASK, RUN_TRIGGER } from "@scraper/core/constants"
import { DeliveryId, MonitorId, RuleId } from "@scraper/core/domain"
import { Schema } from "effect"

export const ScrapeJobPayload = Schema.Struct({
  monitorId: MonitorId,
  trigger: Schema.Literal(
    RUN_TRIGGER.schedule,
    RUN_TRIGGER.manual,
    RUN_TRIGGER.retry,
    RUN_TRIGGER.test,
  ),
  attempt: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
})
export type ScrapeJobPayload = typeof ScrapeJobPayload.Type

export const NotifyJobPayload = Schema.Struct({
  deliveryId: DeliveryId,
})
export type NotifyJobPayload = typeof NotifyJobPayload.Type

export const DigestJobPayload = Schema.Struct({
  ruleId: RuleId,
  windowStart: Schema.String,
  windowEnd: Schema.String,
})
export type DigestJobPayload = typeof DigestJobPayload.Type

export const MaintenanceJobPayload = Schema.Struct({
  task: Schema.Literal(
    MAINTENANCE_TASK.reconcileSchedules,
    MAINTENANCE_TASK.sweepRuns,
    MAINTENANCE_TASK.sweepSessions,
    MAINTENANCE_TASK.refreshStats,
    MAINTENANCE_TASK.pruneRobots,
    MAINTENANCE_TASK.heartbeat,
  ),
})
export type MaintenanceJobPayload = typeof MaintenanceJobPayload.Type
