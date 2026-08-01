import { QUEUE, REDIS_KEY, SPAN, type QueueName } from "@scraper/core/constants"
import { metrics } from "@scraper/core/observability"
import { Clock, Effect, Metric } from "effect"

import { RedisClient } from "../../redis/index.js"

const MONITORED_QUEUES = Object.values(QUEUE) as QueueName[]
const MS_PER_SECOND = 1000

export const schedulerHealth = Effect.fn(SPAN.maintenance.schedulerHealth)(function* () {
  const redis = yield* RedisClient
  const now = yield* Clock.currentTimeMillis

  yield* Effect.forEach(
    MONITORED_QUEUES,
    (queue) =>
      Effect.gen(function* () {
        const raw = yield* redis.get(REDIS_KEY.schedulerLastFire(queue))
        if (raw === null) return

        const lastFireMs = Number(raw)
        if (Number.isNaN(lastFireMs)) return

        const ageSeconds = Math.max(0, (now - lastFireMs) / MS_PER_SECOND)
        yield* Metric.set(Metric.tagged(metrics.schedulerLastFireAge, "queue", queue), ageSeconds)
      }),
    { discard: true },
  )
})
