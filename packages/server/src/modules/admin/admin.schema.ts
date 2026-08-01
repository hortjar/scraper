import { NonNegativeInt } from "@scraper/core/domain"
import { Schema } from "effect"

export const QueueDepthDto = Schema.Struct({
  name: Schema.String,
  waiting: NonNegativeInt,
  active: NonNegativeInt,
  delayed: NonNegativeInt,
  failed: NonNegativeInt,
})

export const DeliveryCountDto = Schema.Struct({
  status: Schema.String,
  total: NonNegativeInt,
})

export const AdminStatsDto = Schema.Struct({
  users: Schema.Struct({ total: NonNegativeInt, admins: NonNegativeInt }),
  monitors: Schema.Struct({
    total: NonNegativeInt,
    enabled: NonNegativeInt,
    degraded: NonNegativeInt,
  }),
  runs: Schema.Struct({
    total: NonNegativeInt,
    failed: NonNegativeInt,
    changed: NonNegativeInt,
  }),
  deliveries: Schema.Array(DeliveryCountDto),
  queues: Schema.Array(QueueDepthDto),
  windowHours: NonNegativeInt,
})
export type AdminStatsDto = typeof AdminStatsDto.Type
