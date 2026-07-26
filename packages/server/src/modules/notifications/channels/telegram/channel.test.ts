import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { provideChannel } from "../../test-support/channel-harness.js"
import { sampleMessage, samplePayload } from "../../test-support/fixtures.js"
import { stubHttpClient } from "../../test-support/http-client-stub.js"

import { telegramChannel } from "./channel.js"
import type { TelegramConfig } from "./config.js"

const config: TelegramConfig = { botToken: "123456:ABC-DEF-token", chatId: "-100123456" }

const context = {
  deliveryId: "delivery-1",
  config,
  message: sampleMessage(),
  payload: samplePayload(),
}

describe("telegramChannel", () => {
  it.effect("succeeds and captures the provider message id", () =>
    Effect.gen(function* () {
      const layer = stubHttpClient(() =>
        Effect.succeed({
          status: 200,
          bodyText: JSON.stringify({ ok: true, result: { message_id: 42 } }),
        }),
      )
      const receipt = yield* telegramChannel.send(context).pipe(provideChannel(layer))
      expect(receipt.providerMessageId).toBe("42")
    }),
  )

  it.effect("treats an ok:false HTTP-200 body as terminal", () =>
    Effect.gen(function* () {
      const layer = stubHttpClient(() =>
        Effect.succeed({
          status: 200,
          bodyText: JSON.stringify({ ok: false, error_code: 400, description: "chat not found" }),
        }),
      )
      const result = yield* Effect.flip(telegramChannel.send(context).pipe(provideChannel(layer)))
      expect(result.retryable).toBe(false)
      expect(result.detail).toContain("chat not found")
    }),
  )

  it.effect("treats a 429 as retryable", () =>
    Effect.gen(function* () {
      const layer = stubHttpClient(() => Effect.succeed({ status: 429, bodyText: "" }))
      const result = yield* Effect.flip(telegramChannel.send(context).pipe(provideChannel(layer)))
      expect(result.retryable).toBe(true)
    }),
  )

  it.effect("escapes MarkdownV2 special characters in field values", () =>
    Effect.gen(function* () {
      let capturedText = ""
      const layer = stubHttpClient((input) => {
        const parsed = JSON.parse(input.body ?? "{}") as { text: string }
        capturedText = parsed.text
        return Effect.succeed({ status: 200, bodyText: JSON.stringify({ ok: true }) })
      })
      const dotted = { ...context, payload: samplePayload({ title: "Price: $99.00 -> $79.00!" }) }
      yield* telegramChannel.send(dotted).pipe(provideChannel(layer))
      expect(capturedText).toContain(String.raw`\.`)
      expect(capturedText).toContain(String.raw`\!`)
    }),
  )
})
