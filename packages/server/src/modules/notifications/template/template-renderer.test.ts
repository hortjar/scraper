import { it } from "@effect/vitest"
import { LOCALE } from "@scraper/core/constants"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { sampleMessage } from "../test-support/fixtures.js"

import { TemplateRenderer } from "./template-renderer.service.js"

const capabilities = {
  richText: true,
  attachments: false,
  maxLength: 4000,
  supportsDigest: true,
  supportsVerification: true,
}

const run = <A, E>(effect: Effect.Effect<A, E, TemplateRenderer>) =>
  effect.pipe(Effect.provide(TemplateRenderer.Default))

describe("TemplateRenderer", () => {
  it.effect("renders the generic template in English", () =>
    run(
      Effect.gen(function* () {
        const renderer = yield* TemplateRenderer
        const payload = yield* renderer.render(sampleMessage(), LOCALE.en, capabilities, null)
        expect(payload.title).toBe("Competitor pricing changed")
      }),
    ),
  )

  it.effect("renders the same message in Czech via the recipient locale", () =>
    run(
      Effect.gen(function* () {
        const renderer = yield* TemplateRenderer
        const payload = yield* renderer.render(sampleMessage(), LOCALE.cs, capabilities, null)
        expect(payload.title).toContain("Competitor pricing")
        expect(payload.title).toContain("se změnil")
      }),
    ),
  )

  it.effect("includes one field per change, truncated to the field cap", () =>
    run(
      Effect.gen(function* () {
        const renderer = yield* TemplateRenderer
        const message = sampleMessage({
          changes: Array.from({ length: 8 }, (_unused, index) => ({
            key: null,
            label: `field-${String(index)}`,
            changeKind: "modified",
            oldValue: "a",
            newValue: "b",
            deltaAbsolute: null,
            deltaPercent: null,
          })),
        })
        const payload = yield* renderer.render(message, LOCALE.en, capabilities, null)
        expect(payload.fields.length).toBe(5)
      }),
    ),
  )

  it.effect("renders a custom template against the recipient locale's data", () =>
    run(
      Effect.gen(function* () {
        const renderer = yield* TemplateRenderer
        const payload = yield* renderer.render(
          sampleMessage(),
          LOCALE.en,
          capabilities,
          "{{monitor.name}} -> {{#each changes}}{{label}}: {{old}} to {{new}}; {{/each}}",
        )
        expect(payload.summaryText).toBe("Competitor pricing -> Price: 129.00 to 99.00; ")
      }),
    ),
  )

  it.effect("rejects a custom template with an unbalanced each block", () =>
    run(
      Effect.gen(function* () {
        const renderer = yield* TemplateRenderer
        const result = yield* Effect.flip(
          renderer.render(
            sampleMessage(),
            LOCALE.en,
            capabilities,
            "{{#each changes}}no closing tag",
          ),
        )
        expect(result._tag).toBe("TemplateInvalid")
      }),
    ),
  )

  it.effect("truncates the summary to the channel's maxLength and keeps a link to the run", () =>
    run(
      Effect.gen(function* () {
        const renderer = yield* TemplateRenderer
        const tightCapabilities = { ...capabilities, maxLength: 40 }
        const message = sampleMessage({
          changes: Array.from({ length: 20 }, (_unused, index) => ({
            key: null,
            label: `a-long-field-label-${String(index)}`,
            changeKind: "modified",
            oldValue: "previous-value",
            newValue: "next-value",
            deltaAbsolute: null,
            deltaPercent: null,
          })),
        })
        const payload = yield* renderer.render(message, LOCALE.en, tightCapabilities, null)
        expect(payload.summaryText.length).toBeLessThanOrEqual(tightCapabilities.maxLength)
        expect(payload.summaryText).toContain(message.links.run)
      }),
    ),
  )
})
