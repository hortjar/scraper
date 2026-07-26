import { REDIS_KEY } from "@scraper/core/constants"
import { Clock, Effect } from "effect"

import { RedisClient } from "./redis-client.service.js"

export const recordQueueFire = (queue: string) =>
  Effect.gen(function* () {
    const redis = yield* RedisClient
    const now = yield* Clock.currentTimeMillis
    yield* redis.set(REDIS_KEY.schedulerLastFire(queue), String(now))
  })
