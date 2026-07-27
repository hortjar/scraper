import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { ChannelId, UserId } from "@scraper/core/domain"
import { ValidationFailed } from "@scraper/core/errors"
import type { SupportedLocale } from "@scraper/core/i18n"
import { MSG } from "@scraper/core/i18n"
import { Clock, Effect, Option, Schema } from "effect"

import { ChannelRepository, ChannelRepositoryLive } from "./channel.repository.js"
import {
  ChannelRegistry,
  ChannelRegistryLive,
  NotificationsHttpClient,
  NotificationsHttpClientLive,
} from "./channels/index.js"
import { CHANNEL_CONFIG_PATH } from "./channels.constants.js"
import type { CreateChannelBody, UpdateChannelBody } from "./channels.schema.js"
import { Crypto, CryptoLive } from "./crypto/crypto.service.js"
import { Mailer, MailerLive } from "./mailer/mailer.service.js"
import { mergeSecret, splitSecret } from "./notifications.config-codec.js"
import type { ErasedNotificationChannel } from "./notifications.types.js"

const KIND_PATH = ["kind"] as const

const unknownKind = (kind: string) =>
  new ValidationFailed({
    issues: [{ path: KIND_PATH, messageKey: MSG.errors.channelKindUnknown, params: { kind } }],
  })

const invalidConfig = () =>
  new ValidationFailed({
    issues: [
      { path: CHANNEL_CONFIG_PATH, messageKey: MSG.errors.channelConfigInvalid, params: {} },
    ],
  })

const verificationUnsupported = (kind: string) =>
  new ValidationFailed({
    issues: [
      {
        path: KIND_PATH,
        messageKey: MSG.errors.channelVerificationUnsupported,
        params: { kind },
      },
    ],
  })

export class Channels extends Effect.Service<Channels>()(SERVICE_TAG.Channels, {
  effect: Effect.gen(function* () {
    const repository = yield* ChannelRepository
    const registry = yield* ChannelRegistry
    const crypto = yield* Crypto
    const httpClient = yield* NotificationsHttpClient
    const mailer = yield* Mailer

    const channelFor = (kind: string): Effect.Effect<ErasedNotificationChannel, ValidationFailed> =>
      Option.match(registry.get(kind), {
        onNone: () => Effect.fail(unknownKind(kind)),
        onSome: (channel) => Effect.succeed(channel),
      })

    const decodeConfig = (channel: ErasedNotificationChannel, config: Record<string, unknown>) =>
      Schema.decodeUnknown(channel.configSchema)(config).pipe(
        Effect.mapError(() => invalidConfig()),
      )

    const encryptSecret = (plaintext: string | null) =>
      plaintext === null
        ? Effect.succeed(null)
        : crypto.encrypt(plaintext).pipe(
            Effect.map((encrypted) => ({
              secret: encrypted.ciphertext,
              iv: encrypted.iv,
              tag: encrypted.tag,
            })),
          )

    const storedSecretPlaintext = (userId: UserId, id: ChannelId, hasSecret: boolean) =>
      hasSecret
        ? Effect.flatMap(repository.getSecret(userId, id), (stored) =>
            stored.secret === null
              ? Effect.succeed(null)
              : crypto.decrypt({
                  ciphertext: stored.secret.secret,
                  iv: stored.secret.iv,
                  tag: stored.secret.tag,
                }),
          )
        : Effect.succeed(null)

    const listKinds = (locale: SupportedLocale) => Effect.sync(() => registry.describe(locale))

    const list = Effect.fn(SPAN.channels.list)(function* (userId: UserId) {
      return yield* repository.list(userId)
    })

    const create = Effect.fn(SPAN.channels.create)(function* (
      userId: UserId,
      body: CreateChannelBody,
    ) {
      const channel = yield* channelFor(body.kind)
      const { publicConfig, secretPlaintext } = splitSecret(channel, body.config)
      yield* decodeConfig(channel, body.config)
      const secret = yield* encryptSecret(secretPlaintext)
      return yield* repository.insert(userId, body.kind, body.name, publicConfig, secret)
    })

    const update = Effect.fn(SPAN.channels.update)(function* (
      userId: UserId,
      id: ChannelId,
      body: UpdateChannelBody,
    ) {
      const existing = yield* repository.findById(userId, id)
      const channel = yield* channelFor(existing.kind)

      if (body.config === undefined) {
        return yield* repository.update(userId, id, {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.enabled !== undefined && { enabled: body.enabled }),
        })
      }

      const { publicConfig, secretPlaintext } = splitSecret(channel, body.config)
      const effectiveSecret =
        secretPlaintext ?? (yield* storedSecretPlaintext(userId, id, existing.hasSecret))
      yield* decodeConfig(channel, mergeSecret(channel, publicConfig, effectiveSecret))
      const secret = secretPlaintext === null ? undefined : yield* encryptSecret(secretPlaintext)

      return yield* repository.update(userId, id, {
        config: publicConfig,
        ...(secret !== undefined && { secret }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
      })
    })

    const remove = Effect.fn(SPAN.channels.remove)(function* (userId: UserId, id: ChannelId) {
      yield* repository.remove(userId, id)
    })

    const test = Effect.fn(SPAN.channels.test)(function* (userId: UserId, id: ChannelId) {
      const record = yield* repository.findById(userId, id)
      const channel = yield* channelFor(record.kind)
      const verify = channel.verify
      if (verify === undefined) return yield* Effect.fail(verificationUnsupported(record.kind))

      const stored = yield* repository.getSecret(userId, id)
      const secretPlaintext = yield* storedSecretPlaintext(userId, id, record.hasSecret)
      const fullConfig = mergeSecret(channel, stored.config, secretPlaintext)
      const config = yield* decodeConfig(channel, fullConfig)

      yield* verify(config).pipe(
        Effect.provideService(NotificationsHttpClient, httpClient),
        Effect.provideService(Mailer, mailer),
      )

      const testedAt = new Date(yield* Clock.currentTimeMillis)
      yield* repository.markVerified(userId, id, testedAt)
      return testedAt
    })

    return { listKinds, list, create, update, remove, test } as const
  }),

  dependencies: [
    ChannelRepositoryLive,
    ChannelRegistryLive,
    CryptoLive,
    NotificationsHttpClientLive,
    MailerLive,
  ],
}) {}

export const ChannelsLive = Channels.Default
