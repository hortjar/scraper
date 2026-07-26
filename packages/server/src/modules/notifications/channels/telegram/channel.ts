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

import { TelegramConfig } from "./config.js"
import { buildTelegramText, escapeMarkdownV2 } from "./render.js"
import { TELEGRAM_API_BASE, TELEGRAM_PARSE_MODE } from "./telegram.constants.js"

interface TelegramResponseBody {
  readonly ok: boolean
  readonly error_code?: number
  readonly description?: string
  readonly result?: { readonly message_id: number }
}

const parseBody = (bodyText: string): TelegramResponseBody | null => {
  try {
    return JSON.parse(bodyText) as TelegramResponseBody
  } catch {
    return null
  }
}

const send = (
  config: TelegramConfig,
  text: string,
): Effect.Effect<DeliveryReceipt, DeliveryFailed, ChannelDependencies> =>
  Effect.gen(function* () {
    const httpClient = yield* NotificationsHttpClient
    const response = yield* httpClient
      .request({
        url: `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          parse_mode: TELEGRAM_PARSE_MODE,
        }),
        timeoutMs: TIMEOUT.notifySendMs,
      })
      .pipe(
        Effect.mapError(
          (failure) =>
            new DeliveryFailed({
              channelKind: CHANNEL_KIND.telegram,
              retryable: true,
              detail: failure.detail,
            }),
        ),
      )

    if (
      response.status === RATE_LIMITED_HTTP_STATUS ||
      response.status >= RETRYABLE_HTTP_STATUS_FLOOR
    ) {
      return yield* Effect.fail(
        new DeliveryFailed({
          channelKind: CHANNEL_KIND.telegram,
          retryable: true,
          status: response.status,
          detail: response.bodyText.slice(0, 500),
        }),
      )
    }

    const body = parseBody(response.bodyText)
    if (response.status >= 200 && response.status < 300 && body?.ok) {
      return { providerMessageId: body.result ? String(body.result.message_id) : null }
    }

    return yield* Effect.fail(
      new DeliveryFailed({
        channelKind: CHANNEL_KIND.telegram,
        retryable: body?.error_code === RATE_LIMITED_HTTP_STATUS,
        status: response.status,
        detail: body?.description ?? response.bodyText.slice(0, 500),
      }),
    )
  })

export const telegramChannel = defineChannel({
  kind: CHANNEL_KIND.telegram,
  displayNameKey: MSG.channels.telegramName,
  descriptionKey: MSG.channels.telegramDescription,
  icon: CHANNEL_ICON.telegram,
  configSchema: TelegramConfig,
  secretFields: ["botToken"],
  fields: [
    {
      name: "botToken",
      labelKey: MSG.channels.fields.botToken,
      type: "secret",
      required: true,
      secret: true,
      placeholder: "123456:ABC-DEF…",
    },
    {
      name: "chatId",
      labelKey: MSG.channels.fields.chatId,
      type: "string",
      required: true,
      secret: false,
      placeholder: "-1001234567890",
    },
  ],
  capabilities: {
    richText: true,
    attachments: false,
    maxLength: 4096,
    supportsDigest: true,
    supportsVerification: true,
  },
  send: Effect.fn(SPAN.notifications.send)(function* (context: SendContext<TelegramConfig>) {
    return yield* send(context.config, buildTelegramText(context.payload))
  }),
  verify: Effect.fn(SPAN.notifications.verify)(function* (config: TelegramConfig) {
    yield* send(config, `*${escapeMarkdownV2(VERIFICATION_PING_TEXT)}*`)
  }),
})
