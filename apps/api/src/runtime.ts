import { AppConfigLive, appConfig } from "@scraper/core/config"
import { TranslatorLive } from "@scraper/core/i18n"
import { loggerLayer } from "@scraper/core/observability"
import { DatabaseLive } from "@scraper/db"
import { AuthLayer } from "@scraper/server/modules/auth"
import { JobsLayer } from "@scraper/server/modules/jobs"
import { NotificationsLayer } from "@scraper/server/modules/notifications"
import { ScrapingLayer } from "@scraper/server/modules/scraping"
import { Effect, Layer, ManagedRuntime } from "effect"

const LoggerLive = Layer.unwrapEffect(
  Effect.map(appConfig, (config) => loggerLayer(config.logFormat, config.logLevel)),
)

const InfrastructureLayer = Layer.mergeAll(AppConfigLive, LoggerLive, TranslatorLive, DatabaseLive)

export const AppLayer = Layer.mergeAll(
  InfrastructureLayer,
  JobsLayer,
  ScrapingLayer,
  NotificationsLayer,
  AuthLayer,
)

export type AppLayer = typeof AppLayer

export type AppServices = Layer.Layer.Success<AppLayer>

export type AppRuntime = ManagedRuntime.ManagedRuntime<AppServices, Layer.Layer.Error<AppLayer>>

export const makeRuntime = (): AppRuntime => ManagedRuntime.make(AppLayer)
