import { AppConfig } from "@scraper/core/config"
import { APP_ENV, LOG_FIELD, MAIL_DRIVER, SPAN } from "@scraper/core/constants"
import type { MessageParameters, SupportedLocale } from "@scraper/core/i18n"
import { Translator } from "@scraper/core/i18n"
import { Effect, Redacted } from "effect"
import { createTransport, type Transporter } from "nodemailer"

import { AUTH_TAG } from "./auth.constants.js"
import { MailSendFailed } from "./auth.errors.js"

export interface AuthMail {
  readonly to: string
  readonly locale: SupportedLocale
  readonly subjectKey: string
  readonly bodyKey: string
  readonly params: MessageParameters
  readonly link: string
}

const MAIL_FIELD = {
  to: "to",
  subject: "subject",
  link: "link",
  driver: "driver",
} as const

const buildTransport = (config: AppConfig): Transporter | null => {
  if (!config.mail.isAvailable) return null
  if (config.mail.driver !== MAIL_DRIVER.smtp) return null
  return createTransport({
    host: config.mail.smtpHost,
    port: config.mail.smtpPort,
    secure: config.mail.smtpSecure,
    ...(config.mail.smtpUser !== "" && {
      auth: {
        user: config.mail.smtpUser,
        pass: Redacted.value(config.mail.smtpPassword),
      },
    }),
  })
}

export class AuthMailer extends Effect.Service<AuthMailer>()(AUTH_TAG.Mailer, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const translator = yield* Translator
    const transport = buildTransport(config)

    const logInstead = (mail: AuthMail, subject: string) =>
      Effect.logInfo(SPAN.auth.sendMail).pipe(
        Effect.annotateLogs({
          [MAIL_FIELD.to]: mail.to,
          [MAIL_FIELD.subject]: subject,
          [MAIL_FIELD.driver]: config.mail.driver,
          ...(config.app.env === APP_ENV.development && { [MAIL_FIELD.link]: mail.link }),
        }),
      )

    const send = Effect.fn(SPAN.auth.sendMail)(function* (mail: AuthMail) {
      const subject = translator.render(mail.subjectKey, mail.params, mail.locale)
      const body = `${translator.render(mail.bodyKey, mail.params, mail.locale)}\n\n${mail.link}\n`

      if (transport === null) {
        yield* logInstead(mail, subject)
        return
      }

      yield* Effect.tryPromise({
        try: () => transport.sendMail({ from: config.mail.from, to: mail.to, subject, text: body }),
        catch: (cause) => new MailSendFailed({ detail: String(cause) }),
      }).pipe(
        Effect.catchTag("MailSendFailed", (error) =>
          Effect.logError(SPAN.auth.sendMail).pipe(
            Effect.annotateLogs({
              [LOG_FIELD.errorTag]: error._tag,
              [MAIL_FIELD.to]: mail.to,
            }),
          ),
        ),
      )
    })

    return { send, isAvailable: config.mail.isAvailable } as const
  }),
  dependencies: [AppConfig.Default, Translator.Default],
}) {}
