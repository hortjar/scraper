import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { provideChannel } from "../../test-support/channel-harness.js"
import { sampleMessage, samplePayload } from "../../test-support/fixtures.js"
import { respondingWith, stubHttpClient } from "../../test-support/http-client-stub.js"

import { webhookChannel } from "./channel.js"
import type { WebhookConfig } from "./config.js"

const config: WebhookConfig = {
  url: "https://sink.example.com/hooks/scraper" as WebhookConfig["url"],
  secret: "a-very-secret-value",
  method: "POST",
  headers: {},
}

const context = {
  deliveryId: "delivery-1",
  config,
  message: sampleMessage(),
  payload: samplePayload(),
}

describe("webhookChannel", () => {
  it.effect("succeeds on a 2xx response and signs the payload", () =>
    Effect.gen(function* () {
      let seenSignature = ""
      const layer = stubHttpClient((input) => {
        seenSignature = input.headers["x-scraper-signature"] ?? ""
        return Effect.succeed({ status: 200, bodyText: "ok" })
      })
      const receipt = yield* webhookChannel.send(context).pipe(provideChannel(layer))
      expect(receipt.providerMessageId).toBeNull()
      expect(seenSignature).toMatch(/^sha256=[0-9a-f]{64}$/)
    }),
  )

  it.effect("classifies a 429 as retryable", () =>
    Effect.gen(function* () {
      const failing = respondingWith(429, "slow down")
      const result = yield* Effect.flip(webhookChannel.send(context).pipe(provideChannel(failing)))
      expect(result.retryable).toBe(true)
    }),
  )

  it.effect("classifies a 500 as retryable", () =>
    Effect.gen(function* () {
      const failing = respondingWith(500, "oops")
      const result = yield* Effect.flip(webhookChannel.send(context).pipe(provideChannel(failing)))
      expect(result.retryable).toBe(true)
    }),
  )

  it.effect("classifies a 400 as terminal", () =>
    Effect.gen(function* () {
      const failing = respondingWith(400, "bad request")
      const result = yield* Effect.flip(webhookChannel.send(context).pipe(provideChannel(failing)))
      expect(result.retryable).toBe(false)
    }),
  )

  it.effect("rejects a config url pointing at a private address before making a request", () =>
    Effect.gen(function* () {
      let isCalled = false
      const layer = stubHttpClient(() => {
        isCalled = true
        return Effect.succeed({ status: 200, bodyText: "" })
      })
      const privateContext = {
        ...context,
        config: { ...config, url: "http://127.0.0.1:9000/hook" as WebhookConfig["url"] },
      }
      const result = yield* Effect.flip(
        webhookChannel.send(privateContext).pipe(provideChannel(layer)),
      )
      expect(result.retryable).toBe(false)
      expect(isCalled).toBe(false)
    }),
  )
})
