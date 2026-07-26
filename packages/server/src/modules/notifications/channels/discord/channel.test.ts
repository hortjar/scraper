import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { provideChannel } from "../../test-support/channel-harness.js"
import { sampleMessage, samplePayload } from "../../test-support/fixtures.js"
import { respondingWith, stubHttpClient } from "../../test-support/http-client-stub.js"

import { discordChannel } from "./channel.js"
import type { DiscordConfig } from "./config.js"

const config: DiscordConfig = {
  webhookUrl: "https://discord.com/api/webhooks/000/xxx" as DiscordConfig["webhookUrl"],
}

const context = {
  deliveryId: "delivery-1",
  config,
  message: sampleMessage(),
  payload: samplePayload(),
}

describe("discordChannel", () => {
  it.effect("posts an embed with a color derived from the change direction", () =>
    Effect.gen(function* () {
      let capturedBody = ""
      const layer = stubHttpClient((input) => {
        capturedBody = input.body ?? ""
        return Effect.succeed({ status: 204, bodyText: "" })
      })
      const receipt = yield* discordChannel.send(context).pipe(provideChannel(layer))
      expect(receipt.providerMessageId).toBeNull()
      const parsed = JSON.parse(capturedBody) as { embeds: readonly { color: number }[] }
      expect(parsed.embeds[0]?.color).toBe(0x22_c5_5e)
    }),
  )

  it.effect("classifies a 5xx as retryable", () =>
    Effect.gen(function* () {
      const failing = respondingWith(503)
      const result = yield* Effect.flip(discordChannel.send(context).pipe(provideChannel(failing)))
      expect(result.retryable).toBe(true)
    }),
  )

  it.effect("classifies a 401 (revoked webhook) as terminal", () =>
    Effect.gen(function* () {
      const failing = respondingWith(401, "Unauthorized")
      const result = yield* Effect.flip(discordChannel.send(context).pipe(provideChannel(failing)))
      expect(result.retryable).toBe(false)
    }),
  )
})
