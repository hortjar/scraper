import { it } from "@effect/vitest"
import { CHANNEL_KIND, LOCALE } from "@scraper/core/constants"
import { Effect, Layer, Schema } from "effect"
import { describe, expect } from "vitest"

import { ChannelRegistry, ChannelRegistryLive } from "./registry.service.js"

import { ChannelSetLive } from "./index.js"

const SAMPLE_CONFIG: Readonly<Record<string, unknown>> = {
  [CHANNEL_KIND.email]: { to: "user@example.com" },
  [CHANNEL_KIND.webhook]: { url: "https://sink.example.com/hook", secret: "a-very-long-secret" },
  [CHANNEL_KIND.slack]: { webhookUrl: "https://hooks.slack.com/services/x" },
  [CHANNEL_KIND.discord]: { webhookUrl: "https://discord.com/api/webhooks/x" },
  [CHANNEL_KIND.telegram]: { botToken: "123456:abcdefghij", chatId: "-100123456" },
}

const TestLayer = Layer.provide(ChannelRegistryLive, ChannelSetLive)

describe("channel registry conformance", () => {
  it.effect("every channel's configSchema round-trips a valid sample config", () =>
    Effect.gen(function* () {
      const registry = yield* ChannelRegistry
      for (const channel of registry.list()) {
        const sample = SAMPLE_CONFIG[channel.kind]
        expect(sample, `no sample config for ${channel.kind}`).toBeDefined()
        const decoded = yield* Schema.decodeUnknown(channel.configSchema)(sample)
        expect(decoded).toBeDefined()
      }
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect("every declared secret field is a real key on the decoded config", () =>
    Effect.gen(function* () {
      const registry = yield* ChannelRegistry
      for (const channel of registry.list()) {
        const decoded = yield* Schema.decodeUnknown(channel.configSchema)(
          SAMPLE_CONFIG[channel.kind],
        )
        for (const field of channel.secretFields) {
          expect(Object.hasOwn(decoded as object, field), `${channel.kind}.${field}`).toBe(true)
        }
      }
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect("describe() produces one descriptor per channel with a translated name", () =>
    Effect.gen(function* () {
      const registry = yield* ChannelRegistry
      const descriptors = registry.describe(LOCALE.en)
      expect(descriptors.length).toBe(registry.list().length)
      for (const descriptor of descriptors) {
        expect(descriptor.displayName.length).toBeGreaterThan(0)
        expect(descriptor.displayName.startsWith("channels.")).toBe(false)
        expect(descriptor.fields.every((field) => field.labelKey.length > 0)).toBe(true)
      }
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect("describe() resolves names per locale", () =>
    Effect.gen(function* () {
      const registry = yield* ChannelRegistry
      const en = registry.describe(LOCALE.en).find((d) => d.kind === CHANNEL_KIND.email)
      const cs = registry.describe(LOCALE.cs).find((d) => d.kind === CHANNEL_KIND.email)
      expect(en?.displayName).toBe("Email")
      expect(cs?.displayName).toBe("E-mail")
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect("get() finds a channel by kind and returns None for an unknown kind", () =>
    Effect.gen(function* () {
      const registry = yield* ChannelRegistry
      expect(registry.get(CHANNEL_KIND.slack)._tag).toBe("Some")
      expect(registry.get("not-a-real-kind")._tag).toBe("None")
    }).pipe(Effect.provide(TestLayer)),
  )
})
