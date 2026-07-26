import { AppConfig } from "@scraper/core/config"
import { Effect, Layer } from "effect"

import { NotificationsHttpClient } from "../channels/http-client.service.js"
import { Mailer } from "../mailer/mailer.service.js"
import type { ChannelDependencies as ChannelDependencies } from "../notifications.types.js"

import { withTestConfig } from "./test-config.js"

export const stubMailer = (send: Mailer["send"], isAvailable = true): Layer.Layer<Mailer> =>
  Layer.succeed(Mailer, Mailer.make({ send, isAvailable }))

const silentMailer = stubMailer(() => Effect.succeed({ messageId: null }))

const unusedHttpClient = Layer.succeed(
  NotificationsHttpClient,
  NotificationsHttpClient.make({
    request: () => Effect.die(new Error("channel made an unexpected http request")),
  }),
)

export const provideChannel =
  (
    http: Layer.Layer<NotificationsHttpClient>,
    mailer: Layer.Layer<Mailer> = silentMailer,
    configOverrides: Readonly<Record<string, string>> = {},
  ) =>
  <A, E>(effect: Effect.Effect<A, E, ChannelDependencies>): Effect.Effect<A, E> => {
    const layers = Layer.mergeAll(http, mailer, Layer.orDie(AppConfig.Default))
    return effect.pipe(Effect.provide(layers), withTestConfig(configOverrides))
  }

export const provideMailChannel = (
  mailer: Layer.Layer<Mailer>,
  configOverrides: Readonly<Record<string, string>> = {},
) => provideChannel(unusedHttpClient, mailer, configOverrides)
