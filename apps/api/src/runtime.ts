import { AppConfigLive, appConfig } from "@scraper/core/config"
import { SERVICE_NAME } from "@scraper/core/constants"
import { TranslatorLive } from "@scraper/core/i18n"
import { loggerLayer } from "@scraper/core/observability"
import { DatabaseLive } from "@scraper/db"
import { AdminLayer } from "@scraper/server/modules/admin"
import { AuthLayer } from "@scraper/server/modules/auth"
import { JobsLayer, RedisClient } from "@scraper/server/modules/jobs"
import { LogsLayer, logShipperLayer } from "@scraper/server/modules/logs"
import { MonitorsLayer } from "@scraper/server/modules/monitors"
import { NotificationsLayer } from "@scraper/server/modules/notifications"
import { RunsLayer } from "@scraper/server/modules/runs"
import { ScrapingLayer } from "@scraper/server/modules/scraping"
import { Effect, Layer, ManagedRuntime } from "effect"

const LoggerLive = Layer.unwrapEffect(
  Effect.map(appConfig, (config) => loggerLayer(config.logFormat, config.logLevel)),
)

const LogShipperLive = Layer.unwrapEffect(
  Effect.map(RedisClient, (redis) => logShipperLayer(redis.client, SERVICE_NAME.api)),
).pipe(Layer.provide(RedisClient.Default))

const InfrastructureLayer = Layer.mergeAll(
  AppConfigLive,
  LoggerLive,
  LogShipperLive,
  TranslatorLive,
  DatabaseLive,
)

export const AppLayer = Layer.mergeAll(
  InfrastructureLayer,
  JobsLayer,
  AdminLayer,
  LogsLayer,
  ScrapingLayer,
  MonitorsLayer,
  NotificationsLayer,
  RunsLayer,
  AuthLayer,
)

export type AppLayer = typeof AppLayer

export type AppServices = Layer.Layer.Success<AppLayer>

export type AppRuntime = ManagedRuntime.ManagedRuntime<AppServices, Layer.Layer.Error<AppLayer>>

export const makeRuntime = (): AppRuntime => ManagedRuntime.make(AppLayer)
