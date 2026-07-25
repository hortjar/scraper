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
  client.on("error", () => undefined)

  const check = Effect.tryPromise({
    try: async () => {
      if (client.status === "wait" || client.status === "end") await client.connect()
      const reply = await client.ping()
      return reply === "PONG"
    },
    catch: () => "redis_probe_failed" as const,
  }).pipe(Effect.orElseSucceed(() => false))

  return { name: REDIS_PROBE_NAME, check }
}
