import { REDIS_KEY, SPAN } from "@scraper/core/constants"
import { Effect } from "effect"

import { RedisClient } from "../../redis/index.js"

export const pruneRobots = Effect.fn(SPAN.maintenance.pruneRobots)(function* () {
  const redis = yield* RedisClient
  const keys = yield* redis.scanKeys(REDIS_KEY.robotsTxt("*"))

  const entries = yield* Effect.forEach(
    keys,
    (key) => Effect.map(redis.ttl(key), (ttl) => ({ key, ttl })),
    { concurrency: 10 },
  )

  const withoutExpiry = entries.filter((entry) => entry.ttl < 0).map((entry) => entry.key)

  yield* Effect.forEach(withoutExpiry, (key) => redis.del(key), { discard: true, concurrency: 10 })

  yield* Effect.logInfo("maintenance.pruneRobots.completed").pipe(
    Effect.annotateLogs({ scanned: keys.length, pruned: withoutExpiry.length }),
  )
})
