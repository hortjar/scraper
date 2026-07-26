import { Effect, Layer } from "effect"

import { SERVICE_TAG } from "../constants/service-tags.js"

import { rootConfig, type RootConfig } from "./schema.js"

export * from "./package-version.js"
export * from "./schema.js"

export class AppConfig extends Effect.Service<AppConfig>()(SERVICE_TAG.AppConfig, {
  effect: Effect.gen(function* () {
    const config = yield* rootConfig
    return config
  }),
}) {}

export const AppConfigLive = AppConfig.Default

export const withConfig = <A, E, R>(
  use: (config: RootConfig) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R | AppConfig> => Effect.flatMap(AppConfig, use)

export const configLayerFrom = (config: RootConfig): Layer.Layer<AppConfig> =>
  Layer.succeed(AppConfig, config as AppConfig)
