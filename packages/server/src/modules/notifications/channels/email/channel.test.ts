import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { MailDeliveryFailed } from "../../mailer/mailer.service.js"
import { provideMailChannel, stubMailer } from "../../test-support/channel-harness.js"
import { sampleMessage, samplePayload } from "../../test-support/fixtures.js"

import { emailChannel } from "./channel.js"
import type { EmailConfig } from "./config.js"

const config: EmailConfig = { to: "user@example.com" as EmailConfig["to"] }

const context = {
  deliveryId: "delivery-1",
  config,
  message: sampleMessage(),
  payload: samplePayload(),
}

describe("emailChannel", () => {
  it.effect("sends through the Mailer and returns its message id", () =>
    Effect.gen(function* () {
      const layer = stubMailer(() => Effect.succeed({ messageId: "abc-123" }))
      const receipt = yield* emailChannel.send(context).pipe(provideMailChannel(layer))
      expect(receipt.providerMessageId).toBe("abc-123")
    }),
  )

  it.effect("is terminal when mail is not configured", () =>
    Effect.gen(function* () {
      const layer = stubMailer(
        () =>
          Effect.fail(new MailDeliveryFailed({ reason: "not_configured", detail: "no transport" })),
        false,
      )
      const result = yield* Effect.flip(emailChannel.send(context).pipe(provideMailChannel(layer)))
      expect(result.retryable).toBe(false)
    }),
  )

  it.effect("is retryable on a transient transport failure", () =>
    Effect.gen(function* () {
      const layer = stubMailer(() =>
        Effect.fail(new MailDeliveryFailed({ reason: "transport", detail: "connection reset" })),
      )
      const result = yield* Effect.flip(emailChannel.send(context).pipe(provideMailChannel(layer)))
      expect(result.retryable).toBe(true)
    }),
  )
})
