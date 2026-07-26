import type { RootConfig } from "@scraper/core/config"
import { BULLMQ_CONNECTION_OPTIONS } from "@scraper/server/modules/jobs"
import { Redacted } from "effect"
import Redis from "ioredis"

export const makeConnection = (redisConfig: RootConfig["redis"]): Redis =>
  new Redis(Redacted.value(redisConfig.url), BULLMQ_CONNECTION_OPTIONS)
