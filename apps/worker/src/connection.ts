import type { RootConfig } from "@scraper/core/config"
import { Redacted } from "effect"
import Redis, { type RedisOptions } from "ioredis"

const BULLMQ_CONNECTION_OPTIONS = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
} satisfies Partial<RedisOptions>

export const makeConnection = (redisConfig: RootConfig["redis"]): Redis =>
  new Redis(Redacted.value(redisConfig.url), BULLMQ_CONNECTION_OPTIONS)
