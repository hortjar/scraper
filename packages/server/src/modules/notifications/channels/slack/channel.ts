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

import { SlackConfig } from "./config.js"
import { buildSlackMessage, type SlackMessage } from "./render.js"

const post = (
  webhookUrl: string,
  body: SlackMessage,
): Effect.Effect<DeliveryReceipt, DeliveryFailed, ChannelDependencies> =>
  Effect.gen(function* () {
    const url = yield* guardWebhookUrl(webhookUrl).pipe(
      Effect.mapError(
        () =>
          new DeliveryFailed({
            channelKind: CHANNEL_KIND.slack,
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
              channelKind: CHANNEL_KIND.slack,
              retryable: true,
              detail: failure.detail,
            }),
        ),
      )

    if (response.status >= 200 && response.status < 300) return { providerMessageId: null }
    return yield* Effect.fail(
      new DeliveryFailed({
        channelKind: CHANNEL_KIND.slack,
        retryable:
          response.status === RATE_LIMITED_HTTP_STATUS ||
          response.status >= RETRYABLE_HTTP_STATUS_FLOOR,
        status: response.status,
        detail: response.bodyText.slice(0, 500),
      }),
    )
  })

export const slackChannel = defineChannel({
  kind: CHANNEL_KIND.slack,
  displayNameKey: MSG.channels.slackName,
  descriptionKey: MSG.channels.slackDescription,
  icon: CHANNEL_ICON.slack,
  configSchema: SlackConfig,
  secretFields: ["webhookUrl"],
  fields: [
    {
      name: "webhookUrl",
      labelKey: MSG.channels.fields.webhookUrl,
      type: "secret",
      required: true,
      secret: true,
      placeholder: "https://hooks.slack.com/services/…",
    },
  ],
  capabilities: {
    richText: true,
    attachments: false,
    maxLength: 3000,
    supportsDigest: true,
    supportsVerification: true,
  },
  send: Effect.fn(SPAN.notifications.send)(function* (context: SendContext<SlackConfig>) {
    return yield* post(context.config.webhookUrl, buildSlackMessage(context.payload))
  }),
  verify: Effect.fn(SPAN.notifications.verify)(function* (config: SlackConfig) {
    yield* post(config.webhookUrl, { text: VERIFICATION_PING_TEXT, blocks: [] })
  }),
})
