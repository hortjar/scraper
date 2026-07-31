import { AppConfig } from "@scraper/core/config"
import { LOG_FIELD, SPAN } from "@scraper/core/constants"
import { Database } from "@scraper/db"
import { Effect, Layer } from "effect"

import { NotifyRunner } from "../jobs/index.js"
import type { NotifyJobPayload } from "../jobs/index.js"

import { makeDeliveryContextLoader } from "./delivery-context.js"
import { NotificationDispatcher } from "./dispatcher/notification-dispatcher.service.js"

const MISSING_DELIVERY_LOG = "job.notify.missingDelivery"

export type NotifyRunnerServices = AppConfig | Database | NotificationDispatcher

const runNotify = (payload: NotifyJobPayload) =>
  Effect.gen(function* () {
    const config = yield* AppConfig
    const database = yield* Database
    const dispatcher = yield* NotificationDispatcher

    const load = makeDeliveryContextLoader(database, config.app.appUrl, config.app.defaultLocale)
    const context = yield* load(payload.deliveryId)

    if (context === null) {
      return yield* Effect.logWarning(MISSING_DELIVERY_LOG).pipe(
        Effect.annotateLogs({ [LOG_FIELD.deliveryId]: payload.deliveryId }),
      )
    }

    yield* dispatcher.deliver({
      deliveryId: payload.deliveryId,
      userId: context.userId,
      channelId: context.channelId,
      message: context.message,
      customTemplate: context.customTemplate,
    })
  }).pipe(Effect.withSpan(SPAN.notifications.dispatch), Effect.asVoid)

export const NotifyRunnerLive = Layer.effect(
  NotifyRunner,
  Effect.map(Effect.context<NotifyRunnerServices>(), (context) =>
    NotifyRunner.make({
      execute: (payload: NotifyJobPayload) => runNotify(payload).pipe(Effect.provide(context)),
    }),
  ),
)
