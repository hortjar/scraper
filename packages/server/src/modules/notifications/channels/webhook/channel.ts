import { CHANNEL_KIND, SPAN, TIMEOUT } from "@scraper/core/constants"
import { DeliveryFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { Clock, Effect } from "effect"

import {
  CHANNEL_ICON,
  HTTP_METHOD,
  RATE_LIMITED_HTTP_STATUS,
  RETRYABLE_HTTP_STATUS_FLOOR,
  WEBHOOK_EVENT_NAME,
} from "../../notifications.constants.js"
import type {
  ChannelDependencies as ChannelDependencies,
  DeliveryReceipt,
  SendContext,
} from "../../notifications.types.js"
import { defineChannel } from "../../notifications.types.js"
import { type HttpRequestFailed, NotificationsHttpClient } from "../http-client.service.js"

import { WebhookConfig } from "./config.js"
import { signWebhookPayload } from "./signing.js"
import { guardWebhookUrl } from "./url-guard.js"

const buildEnvelope = (context: SendContext<WebhookConfig>) => ({
  event: WEBHOOK_EVENT_NAME,
  monitor: context.message.monitor,
  rule: context.message.rule,
  run: {
    id: context.message.run.id,
    at: context.message.run.at.toISOString(),
    durationMs: context.message.run.durationMs,
  },
  changes: context.message.changes.map((change) => ({
    key: change.key,
    kind: change.changeKind,
    old: change.oldValue,
    new: change.newValue,
    deltaAbsolute: change.deltaAbsolute,
    deltaPercent: change.deltaPercent,
  })),
  links: context.message.links,
})

const classify = (status: number, detail: string): DeliveryFailed =>
  new DeliveryFailed({
    channelKind: CHANNEL_KIND.webhook,
    retryable: status === RATE_LIMITED_HTTP_STATUS || status >= RETRYABLE_HTTP_STATUS_FLOOR,
    status,
    detail,
  })

const deliver = (
  config: WebhookConfig,
  deliveryId: string,
  body: string,
): Effect.Effect<DeliveryReceipt, DeliveryFailed, ChannelDependencies> =>
  Effect.gen(function* () {
    const url = yield* guardWebhookUrl(config.url).pipe(
      Effect.mapError(
        () =>
          new DeliveryFailed({
            channelKind: CHANNEL_KIND.webhook,
            retryable: false,
            detail: "webhook url failed SSRF validation",
          }),
      ),
    )
    const httpClient = yield* NotificationsHttpClient
    const timestamp = String(Math.trunc((yield* Clock.currentTimeMillis) / 1000))
    const signature = signWebhookPayload(config.secret, timestamp, body)

    const response = yield* httpClient
      .request({
        url: url.toString(),
        method: config.method,
        headers: {
          ...config.headers,
          "content-type": "application/json",
          "x-scraper-event": WEBHOOK_EVENT_NAME,
          "x-scraper-delivery": deliveryId,
          "x-scraper-timestamp": timestamp,
          "x-scraper-signature": signature,
        },
        body,
        timeoutMs: TIMEOUT.notifySendMs,
      })
      .pipe(
        Effect.mapError(
          (failure: HttpRequestFailed) =>
            new DeliveryFailed({
              channelKind: CHANNEL_KIND.webhook,
              retryable: true,
              detail: failure.detail,
            }),
        ),
      )

    if (response.status >= 200 && response.status < 300) {
      return { providerMessageId: null }
    }
    return yield* Effect.fail(classify(response.status, response.bodyText.slice(0, 500)))
  })

export const webhookChannel = defineChannel({
  kind: CHANNEL_KIND.webhook,
  displayNameKey: MSG.channels.webhookName,
  descriptionKey: MSG.channels.webhookDescription,
  icon: CHANNEL_ICON.webhook,
  configSchema: WebhookConfig,
  secretFields: ["secret"],
  fields: [
    {
      name: "url",
      labelKey: MSG.channels.fields.url,
      type: "url",
      required: true,
      secret: false,
      placeholder: "https://example.com/hooks/scraper",
    },
    {
      name: "method",
      labelKey: MSG.channels.fields.method,
      type: "select",
      required: false,
      secret: false,
      options: [HTTP_METHOD.get, HTTP_METHOD.post, HTTP_METHOD.put, HTTP_METHOD.patch],
    },
    {
      name: "secret",
      labelKey: MSG.channels.fields.secret,
      type: "secret",
      required: true,
      secret: true,
    },
    {
      name: "headers",
      labelKey: MSG.channels.fields.headers,
      type: "string",
      required: false,
      secret: false,
      placeholder: '{"X-Custom":"value"}',
    },
  ],
  capabilities: {
    richText: false,
    attachments: false,
    maxLength: 65_536,
    supportsDigest: true,
    supportsVerification: true,
  },
  send: Effect.fn(SPAN.notifications.send)(function* (context: SendContext<WebhookConfig>) {
    return yield* deliver(
      context.config,
      context.deliveryId,
      JSON.stringify(buildEnvelope(context)),
    )
  }),
  verify: Effect.fn(SPAN.notifications.verify)(function* (config: WebhookConfig) {
    yield* deliver(config, "verify", JSON.stringify({ event: "test" }))
  }),
})
