import type { RootConfig } from "@scraper/core/config"
import { Effect, Redacted } from "effect"
import Redis from "ioredis"

import type { HealthProbe } from "./health-probe.js"

const REDIS_PROBE_NAME = "redis"

export const makeRedisProbe = (redisConfig: RootConfig["redis"]): HealthProbe => {
  const client = new Redis(Redacted.value(redisConfig.url), {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  })
  const connection = { hasFaulted: false }

  client.on("error", () => {
    connection.hasFaulted = true
  })

  const check = Effect.tryPromise({
    try: async () => {
      connection.hasFaulted = false
      if (client.status === "wait" || client.status === "end") await client.connect()
      await client.ping()
      return !connection.hasFaulted
    },
    catch: () => "redis_probe_failed" as const,
  }).pipe(Effect.orElseSucceed(() => false))

  return { name: REDIS_PROBE_NAME, check }
}
