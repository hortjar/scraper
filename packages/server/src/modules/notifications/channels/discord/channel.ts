import { CHANNEL_KIND, SPAN, TIMEOUT } from "@scraper/core/constants"
import { DeliveryFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { Effect } from "effect"

import {
  CHANNEL_ICON,
  RATE_LIMITED_HTTP_STATUS,
  RETRYABLE_HTTP_STATUS_FLOOR,
  VERIFICATION_PING_TEXT,
} from "../../notifications.constants.js"
import type {
  ChannelDependencies as ChannelDependencies,
  DeliveryReceipt,
  SendContext,
} from "../../notifications.types.js"
import { defineChannel } from "../../notifications.types.js"
import { NotificationsHttpClient } from "../http-client.service.js"
import { guardWebhookUrl } from "../webhook/url-guard.js"

import { DiscordConfig } from "./config.js"
import { buildDiscordMessage, type DiscordMessage } from "./render.js"

const post = (
  webhookUrl: string,
  body: DiscordMessage,
): Effect.Effect<DeliveryReceipt, DeliveryFailed, ChannelDependencies> =>
  Effect.gen(function* () {
    const url = yield* guardWebhookUrl(webhookUrl).pipe(
      Effect.mapError(
        () =>
          new DeliveryFailed({
            channelKind: CHANNEL_KIND.discord,
            retryable: false,
            detail: "webhook url failed SSRF validation",
          }),
      ),
    )
    const httpClient = yield* NotificationsHttpClient
    const response = yield* httpClient
      .request({
        url: url.toString(),
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: TIMEOUT.notifySendMs,
      })
      .pipe(
        Effect.mapError(
          (failure) =>
            new DeliveryFailed({
              channelKind: CHANNEL_KIND.discord,
              retryable: true,
              detail: failure.detail,
            }),
        ),
      )

    if (response.status >= 200 && response.status < 300) return { providerMessageId: null }
    return yield* Effect.fail(
      new DeliveryFailed({
        channelKind: CHANNEL_KIND.discord,
        retryable:
          response.status === RATE_LIMITED_HTTP_STATUS ||
          response.status >= RETRYABLE_HTTP_STATUS_FLOOR,
        status: response.status,
        detail: response.bodyText.slice(0, 500),
      }),
    )
  })

export const discordChannel = defineChannel({
  kind: CHANNEL_KIND.discord,
  displayNameKey: MSG.channels.discordName,
  descriptionKey: MSG.channels.discordDescription,
  icon: CHANNEL_ICON.discord,
  configSchema: DiscordConfig,
  secretFields: ["webhookUrl"],
  fields: [
    {
      name: "webhookUrl",
      labelKey: MSG.channels.fields.webhookUrl,
      type: "secret",
      required: true,
      secret: true,
      placeholder: "https://discord.com/api/webhooks/…",
    },
  ],
  capabilities: {
    richText: true,
    attachments: false,
    maxLength: 4096,
    supportsDigest: true,
    supportsVerification: true,
  },
  send: Effect.fn(SPAN.notifications.send)(function* (context: SendContext<DiscordConfig>) {
    return yield* post(
      context.config.webhookUrl,
      buildDiscordMessage(context.payload, context.message),
    )
  }),
  verify: Effect.fn(SPAN.notifications.verify)(function* (config: DiscordConfig) {
    yield* post(config.webhookUrl, {
      embeds: [
        {
          title: VERIFICATION_PING_TEXT,
          description: "",
          url: "",
          color: 0x58_65_f2,
          fields: [],
        },
      ],
    })
  }),
})
