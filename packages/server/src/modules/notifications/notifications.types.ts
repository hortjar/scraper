import type { AppConfig } from "@scraper/core/config"
import type { ChannelField, NotificationMessage } from "@scraper/core/domain"
import type { DeliveryFailed } from "@scraper/core/errors"
import type { Effect, Schema } from "effect"

import type { NotificationsHttpClient } from "./channels/http-client.service.js"
import type { Mailer } from "./mailer/mailer.service.js"

export type ChannelDependencies = NotificationsHttpClient | Mailer | AppConfig

export interface ChannelCapabilities {
  readonly richText: boolean
  readonly attachments: boolean
  readonly maxLength: number
  readonly supportsDigest: boolean
  readonly supportsVerification: boolean
}

export interface ChannelPayloadField {
  readonly label: string
  readonly value: string
}

export interface ChannelPayload {
  readonly title: string
  readonly summaryText: string
  readonly summaryMarkdown: string
  readonly fields: readonly ChannelPayloadField[]
  readonly url: string
}

export interface DeliveryReceipt {
  readonly providerMessageId: string | null
}

export interface SendContext<Config> {
  readonly deliveryId: string
  readonly config: Config
  readonly message: NotificationMessage
  readonly payload: ChannelPayload
}

export interface NotificationChannel<Config = unknown, Encoded = unknown> {
  readonly kind: string
  readonly displayNameKey: string
  readonly descriptionKey: string
  readonly icon: string
  readonly configSchema: Schema.Schema<Config, Encoded>
  readonly secretFields: readonly string[]
  readonly fields: readonly ChannelField[]
  readonly capabilities: ChannelCapabilities
  readonly send: (
    context: SendContext<Config>,
  ) => Effect.Effect<DeliveryReceipt, DeliveryFailed, ChannelDependencies>
  readonly verify?: (config: Config) => Effect.Effect<void, DeliveryFailed, ChannelDependencies>
  readonly render?: (message: NotificationMessage, config: Config) => ChannelPayload
}

export const defineChannel = <Config, Encoded>(
  channel: NotificationChannel<Config, Encoded>,
): NotificationChannel<Config, Encoded> => channel

export type ErasedNotificationChannel = NotificationChannel

export const eraseChannel = <Config, Encoded>(
  channel: NotificationChannel<Config, Encoded>,
): ErasedNotificationChannel => channel as unknown as ErasedNotificationChannel
