import { AppConfig } from "@scraper/core/config"
import { MAIL_DRIVER, SERVICE_TAG, SPAN, TIMEOUT } from "@scraper/core/constants"
import { Data, Effect, Random, Redacted } from "effect"
import nodemailer from "nodemailer"

import { NotificationsHttpClient } from "../channels/http-client.service.js"

import {
  CONSOLE_MESSAGE_ID_PREFIX,
  MAILER_CONTENT_TYPE,
  RESEND_API_URL,
} from "./mailer.constants.js"

export class MailDeliveryFailed extends Data.TaggedError("MailDeliveryFailed")<{
  readonly reason: "not_configured" | "transport" | "network"
  readonly detail: string
}> {}

export interface MailMessage {
  readonly to: string
  readonly subject: string
  readonly text: string
  readonly html?: string
}

export interface MailReceipt {
  readonly messageId: string | null
}

export class Mailer extends Effect.Service<Mailer>()(SERVICE_TAG.Mailer, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const httpClient = yield* NotificationsHttpClient

    const smtpTransport =
      config.mail.driver === MAIL_DRIVER.smtp && config.mail.isAvailable
        ? nodemailer.createTransport({
            host: config.mail.smtpHost,
            port: config.mail.smtpPort,
            secure: config.mail.smtpSecure,
            auth: config.mail.smtpUser
              ? { user: config.mail.smtpUser, pass: Redacted.value(config.mail.smtpPassword) }
              : undefined,
          })
        : null

    const sendConsole = (message: MailMessage) =>
      Effect.gen(function* () {
        const suffix = yield* Random.nextIntBetween(0, 1_000_000)
        yield* Effect.logInfo("mailer.console.send").pipe(
          Effect.annotateLogs({ to: message.to, subject: message.subject }),
        )
        return { messageId: `${CONSOLE_MESSAGE_ID_PREFIX}-${String(suffix)}` }
      })

    const sendSmtp = (message: MailMessage) =>
      Effect.tryPromise({
        try: async () => {
          if (!smtpTransport) throw new Error("smtp transport not configured")
          const info = await smtpTransport.sendMail({
            from: config.mail.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
          })
          return { messageId: typeof info.messageId === "string" ? info.messageId : null }
        },
        catch: (cause) =>
          new MailDeliveryFailed({
            reason: "transport",
            detail: cause instanceof Error ? cause.message : String(cause),
          }),
      })

    const sendResend = (message: MailMessage) =>
      httpClient
        .request({
          url: RESEND_API_URL,
          method: "POST",
          headers: {
            "content-type": MAILER_CONTENT_TYPE,
            authorization: `Bearer ${Redacted.value(config.mail.resendApiKey)}`,
          },
          body: JSON.stringify({
            from: config.mail.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
          }),
          timeoutMs: TIMEOUT.notifySendMs,
        })
        .pipe(
          Effect.mapError(
            (cause) => new MailDeliveryFailed({ reason: "network", detail: cause.detail }),
          ),
          Effect.flatMap((response) =>
            response.status >= 200 && response.status < 300
              ? Effect.succeed({ messageId: null })
              : Effect.fail(
                  new MailDeliveryFailed({
                    reason: "transport",
                    detail: `resend responded ${String(response.status)}`,
                  }),
                ),
          ),
        )

    const send = Effect.fn(SPAN.mailer.send)(function* (message: MailMessage) {
      if (!config.mail.isAvailable) {
        return yield* Effect.fail(
          new MailDeliveryFailed({
            reason: "not_configured",
            detail: "no mail transport configured",
          }),
        )
      }
      if (config.mail.driver === MAIL_DRIVER.console) return yield* sendConsole(message)
      if (config.mail.driver === MAIL_DRIVER.resend) return yield* sendResend(message)
      return yield* sendSmtp(message)
    })

    return { send, isAvailable: config.mail.isAvailable } as const
  }),
  dependencies: [AppConfig.Default, NotificationsHttpClient.Default],
}) {}

export const MailerLive = Mailer.Default
