import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type {
  ChangeId,
  ChannelId,
  MonitorId,
  NotificationMessage,
  RuleId,
  UserId,
} from "@scraper/core/domain"
import { ChannelNotFound, DataCorruption } from "@scraper/core/errors"
import type { SupportedLocale } from "@scraper/core/i18n"
import { Clock, Effect, Option, Schema } from "effect"

import { ChannelRepository, ChannelRepositoryLive } from "../channel.repository.js"
import {
  ChannelRegistry,
  ChannelRegistryLive,
  NotificationsHttpClient,
  NotificationsHttpClientLive,
} from "../channels/index.js"
import { Crypto, CryptoLive } from "../crypto/crypto.service.js"
import { DeliveryRepository, DeliveryRepositoryLive } from "../delivery.repository.js"
import { Mailer, MailerLive } from "../mailer/mailer.service.js"
import { mergeSecret } from "../notifications.config-codec.js"
import { TemplateRenderer, TemplateRendererLive } from "../template/template-renderer.service.js"

import { withNotifyRetry } from "./retry.js"

export interface DispatchInput {
  readonly userId: UserId
  readonly channelId: ChannelId
  readonly ruleId: RuleId
  readonly monitorId: MonitorId
  readonly changeIds: readonly ChangeId[]
  readonly message: NotificationMessage
  readonly recipientLocale: SupportedLocale
  readonly customTemplate: string | null
}

export class NotificationDispatcher extends Effect.Service<NotificationDispatcher>()(
  SERVICE_TAG.NotificationDispatcher,
  {
    effect: Effect.gen(function* () {
      const registry = yield* ChannelRegistry
      const channelRepo = yield* ChannelRepository
      const deliveryRepo = yield* DeliveryRepository
      const crypto = yield* Crypto
      const templateRenderer = yield* TemplateRenderer
      const appConfig = yield* AppConfig
      const httpClient = yield* NotificationsHttpClient
      const mailer = yield* Mailer

      const dispatch = Effect.fn(SPAN.notifications.dispatch)(function* (input: DispatchInput) {
        const channelRecord = yield* channelRepo.findById(input.userId, input.channelId)
        const channelOption = registry.get(channelRecord.kind)
        if (Option.isNone(channelOption)) {
          return yield* Effect.fail(new ChannelNotFound({ id: input.channelId }))
        }
        if (!channelRecord.enabled) {
          return yield* deliveryRepo.insert({
            ruleId: input.ruleId,
            channelId: input.channelId,
            monitorId: input.monitorId,
            changeIds: input.changeIds,
            status: "suppressed",
            suppressedReason: "channel_disabled",
          })
        }

        const channel = channelOption.value
        const secretRow = yield* channelRepo.getSecret(input.userId, input.channelId)
        const secretPlaintext = secretRow.secret
          ? yield* crypto.decrypt({
              ciphertext: secretRow.secret.secret,
              iv: secretRow.secret.iv,
              tag: secretRow.secret.tag,
            })
          : null
        const fullConfig = mergeSecret(channel, secretRow.config, secretPlaintext)
        const decodedConfig = yield* Schema.decodeUnknown(channel.configSchema)(fullConfig).pipe(
          Effect.mapError(
            (issue) =>
              new DataCorruption({ entity: "notification_channel.config", detail: issue.message }),
          ),
        )

        const payload = yield* templateRenderer.render(
          input.message,
          input.recipientLocale,
          channel.capabilities,
          input.customTemplate,
        )

        const delivery = yield* deliveryRepo.insert({
          ruleId: input.ruleId,
          channelId: input.channelId,
          monitorId: input.monitorId,
          changeIds: input.changeIds,
          status: "pending",
        })

        const attempt = (_attemptNumber: number) =>
          channel
            .send({
              deliveryId: delivery.id,
              config: decodedConfig,
              message: input.message,
              payload,
            })
            .pipe(
              Effect.provideService(NotificationsHttpClient, httpClient),
              Effect.provideService(Mailer, mailer),
              Effect.provideService(AppConfig, appConfig),
            )

        const result = yield* Effect.either(withNotifyRetry(attempt))

        if (result._tag === "Right") {
          const sentAtMillis = yield* Clock.currentTimeMillis
          return yield* deliveryRepo.updateStatus(delivery.id, {
            status: "sent",
            attempts: result.right.attempts,
            providerMessageId: result.right.value.providerMessageId,
            sentAt: new Date(sentAtMillis),
          })
        }

        yield* channelRepo.incrementFailureCount(
          input.userId,
          input.channelId,
          appConfig.mail.channelFailureLimit,
        )
        return yield* deliveryRepo.updateStatus(delivery.id, {
          status: "failed",
          lastError: result.left.detail ?? result.left._tag,
        })
      })

      return { dispatch } as const
    }),
    dependencies: [
      ChannelRegistryLive,
      ChannelRepositoryLive,
      DeliveryRepositoryLive,
      CryptoLive,
      TemplateRendererLive,
      AppConfig.Default,
      NotificationsHttpClientLive,
      MailerLive,
    ],
  },
) {}

export const NotificationDispatcherLive = NotificationDispatcher.Default
