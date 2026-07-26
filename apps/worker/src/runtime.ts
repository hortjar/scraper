import { AppConfigLive, appConfig } from "@scraper/core/config"
import { TranslatorLive } from "@scraper/core/i18n"
import { loggerLayer } from "@scraper/core/observability"
import { DatabaseLive } from "@scraper/db"
import {
  JobProducer,
  NotifyRunnerLive,
  QueueRegistry,
  RateLimiter,
  RedisClient,
  ScrapeRunnerLive,
} from "@scraper/server/modules/jobs"
import { Effect, Layer, ManagedRuntime } from "effect"

const LoggerLive = Layer.unwrapEffect(
  Effect.map(appConfig, (config) => loggerLayer(config.logFormat, config.logLevel)),
)

export const WorkerLayer = Layer.mergeAll(
  AppConfigLive,
  LoggerLive,
  TranslatorLive,
  DatabaseLive,
  RedisClient.Default,
  QueueRegistry.Default,
  RateLimiter.Default,
  JobProducer.Default,
  ScrapeRunnerLive,
  NotifyRunnerLive,
)

export type WorkerLayer = typeof WorkerLayer

export type WorkerServices = Layer.Layer.Success<WorkerLayer>

export type WorkerRuntime = ManagedRuntime.ManagedRuntime<
  WorkerServices,
  Layer.Layer.Error<WorkerLayer>
>

export const makeRuntime = (): WorkerRuntime => ManagedRuntime.make(WorkerLayer)
