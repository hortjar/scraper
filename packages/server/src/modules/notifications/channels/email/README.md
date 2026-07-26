# Email channel

## Setup

There is nothing to configure per channel beyond the recipient address (`to`)
— the SMTP/Resend/console transport is a single, instance-wide setting
(`MAIL_DRIVER` and friends in [docs/11-ENVIRONMENT.md](../../../../../../docs/11-ENVIRONMENT.md)),
owned by `Mailer` in `../../mailer`. That is why this channel's
`secretFields` is empty: there is no per-channel secret to encrypt.

## Availability

`Mailer.isAvailable` mirrors `mailConfig.isAvailable` (from `AppConfig`): a
driver is only "available" once its minimum config is present (`MAIL_FROM`
plus, for `smtp`, `SMTP_HOST`; for `resend`, `RESEND_API_KEY`; the `console`
driver is always available since it just logs). When mail is not configured,
`Mailer.send` fails fast with `MailDeliveryFailed({ reason: "not_configured" })`
**before** attempting a connection, and this channel maps that to a
**terminal** `DeliveryFailed` — never retried, and distinguishable in the
delivery log from a transient SMTP outage.

## Verification

SMTP has no cheap "ping" endpoint, so `verify` sends an actual test email
(same as "Send test notification"). This is the one channel where
verification and testing are the same operation.

## Rendering

`render.ts` builds a minimal HTML table (one row per changed field) plus a
link back to the run; `payload.summaryText` is used as the plain-text part.
Both parts are sent so mail clients that block HTML still show something
readable.
