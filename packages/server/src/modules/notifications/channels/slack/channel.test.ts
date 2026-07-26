import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { provideChannel } from "../../test-support/channel-harness.js"
import { sampleMessage, samplePayload } from "../../test-support/fixtures.js"
import { respondingWith, stubHttpClient } from "../../test-support/http-client-stub.js"

import { slackChannel } from "./channel.js"
import type { SlackConfig } from "./config.js"

const config: SlackConfig = {
  webhookUrl: "https://hooks.slack.com/services/T000/B000/xxx" as SlackConfig["webhookUrl"],
}

const context = {
  deliveryId: "delivery-1",
  config,
  message: sampleMessage(),
  payload: samplePayload(),
}

describe("slackChannel", () => {
  it.effect("posts Block Kit blocks and succeeds on 2xx", () =>
    Effect.gen(function* () {
      let capturedBody = ""
      const layer = stubHttpClient((input) => {
        capturedBody = input.body ?? ""
        return Effect.succeed({ status: 200, bodyText: "ok" })
      })
      const receipt = yield* slackChannel.send(context).pipe(provideChannel(layer))
      expect(receipt.providerMessageId).toBeNull()
      const parsed = JSON.parse(capturedBody) as { blocks: readonly unknown[] }
      expect(parsed.blocks.length).toBeGreaterThan(0)
    }),
  )

  it.effect("classifies a 429 as retryable and a 400 as terminal", () =>
    Effect.gen(function* () {
      const rateLimited = provideChannel(respondingWith(429))
      const retryable = yield* Effect.flip(slackChannel.send(context).pipe(rateLimited))
      expect(retryable.retryable).toBe(true)

      const invalidPayload = provideChannel(respondingWith(400, "invalid_payload"))
      const terminal = yield* Effect.flip(slackChannel.send(context).pipe(invalidPayload))
      expect(terminal.retryable).toBe(false)
    }),
  )

  it.effect("verify sends a lightweight ping without a full message", () =>
    Effect.gen(function* () {
      let isPinged = false
      const layer = stubHttpClient(() => {
        isPinged = true
        return Effect.succeed({ status: 200, bodyText: "ok" })
      })
      yield* slackChannel.verify?.(config).pipe(provideChannel(layer)) ?? Effect.void
      expect(isPinged).toBe(true)
    }),
  )
})
