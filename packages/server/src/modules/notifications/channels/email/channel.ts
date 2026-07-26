import { CHANNEL_KIND, SPAN } from "@scraper/core/constants"
import { DeliveryFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { Effect } from "effect"

import type { MailDeliveryFailed } from "../../mailer/mailer.service.js"
import { Mailer } from "../../mailer/mailer.service.js"
import { CHANNEL_ICON, VERIFICATION_PING_TEXT } from "../../notifications.constants.js"
import type {
  ChannelDependencies as ChannelDependencies,
  DeliveryReceipt,
  SendContext,
} from "../../notifications.types.js"
import { defineChannel } from "../../notifications.types.js"

import { EmailConfig } from "./config.js"
import { buildEmailHtml } from "./render.js"

const toDeliveryFailed = (failure: MailDeliveryFailed): DeliveryFailed =>
  new DeliveryFailed({
    channelKind: CHANNEL_KIND.email,
    retryable: failure.reason !== "not_configured",
    detail: failure.detail,
  })

const deliver = (
  config: EmailConfig,
  subject: string,
  text: string,
  html: string,
): Effect.Effect<DeliveryReceipt, DeliveryFailed, ChannelDependencies> =>
  Effect.gen(function* () {
    const mailer = yield* Mailer
    const receipt = yield* mailer
      .send({ to: config.to, subject, text, html })
      .pipe(Effect.mapError(toDeliveryFailed))
    return { providerMessageId: receipt.messageId }
  })

export const emailChannel = defineChannel({
  kind: CHANNEL_KIND.email,
  displayNameKey: MSG.channels.emailName,
  descriptionKey: MSG.channels.emailDescription,
  icon: CHANNEL_ICON.email,
  configSchema: EmailConfig,
  secretFields: [],
  fields: [
    {
      name: "to",
      labelKey: MSG.channels.fields.to,
      type: "string",
      required: true,
      secret: false,
      placeholder: "you@example.com",
    },
  ],
  capabilities: {
    richText: true,
    attachments: false,
    maxLength: 20_000,
    supportsDigest: true,
    supportsVerification: true,
  },
  send: Effect.fn(SPAN.notifications.send)(function* (context: SendContext<EmailConfig>) {
    return yield* deliver(
      context.config,
      context.payload.title,
      context.payload.summaryText,
      buildEmailHtml(context.payload),
    )
  }),
  verify: Effect.fn(SPAN.notifications.verify)(function* (config: EmailConfig) {
    yield* deliver(
      config,
      VERIFICATION_PING_TEXT,
      VERIFICATION_PING_TEXT,
      `<p>${VERIFICATION_PING_TEXT}</p>`,
    )
  }),
})
