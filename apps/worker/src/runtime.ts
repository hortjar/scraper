import { AppConfigLive, appConfig } from "@scraper/core/config"
import { TranslatorLive } from "@scraper/core/i18n"
import { loggerLayer } from "@scraper/core/observability"
import { DatabaseLive } from "@scraper/db"
import { JobProducer, QueueRegistry, RateLimiter, RedisClient } from "@scraper/server/modules/jobs"
import { MonitorsLayer } from "@scraper/server/modules/monitors"
import {
  NotificationsLayer,
  NotificationsNotifyRunnerLive,
} from "@scraper/server/modules/notifications"
import { RunsLayer, RunsScrapeRunnerLive } from "@scraper/server/modules/runs"
import { ScrapingLayer } from "@scraper/server/modules/scraping"
import { ArtifactStore } from "@scraper/server/modules/storage"
import { Effect, Layer, ManagedRuntime } from "effect"

const LoggerLive = Layer.unwrapEffect(
  Effect.map(appConfig, (config) => loggerLayer(config.logFormat, config.logLevel)),
)

const WorkerBaseLayer = Layer.mergeAll(
  AppConfigLive,
  LoggerLive,
  TranslatorLive,
  DatabaseLive,
  RedisClient.Default,
  QueueRegistry.Default,
  RateLimiter.Default,
  JobProducer.Default,
  ScrapingLayer,
  MonitorsLayer,
  NotificationsLayer,
  RunsLayer,
  ArtifactStore.Default,
)

export const WorkerLayer = Layer.mergeAll(RunsScrapeRunnerLive, NotificationsNotifyRunnerLive).pipe(
  Layer.provideMerge(WorkerBaseLayer),
)

export type WorkerLayer = typeof WorkerLayer

export type WorkerServices = Layer.Layer.Success<WorkerLayer>

export type WorkerRuntime = ManagedRuntime.ManagedRuntime<
  WorkerServices,
  Layer.Layer.Error<WorkerLayer>
>

export const makeRuntime = (): WorkerRuntime => ManagedRuntime.make(WorkerLayer)
