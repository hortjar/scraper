import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import { LOCALE } from "../constants/domain-values.js"

import { MSG } from "./keys.js"

import { catalogs, fallbackLocale, resolveLocale, Translator } from "./index.js"

const flatten = (node: unknown): string[] =>
  typeof node === "string"
    ? [node]
    : Object.values(node as Record<string, unknown>).flatMap(flatten)

describe("catalogs", () => {
  const sourceKeys = Object.keys(catalogs[fallbackLocale])

  it("declares every catalog key in MSG", () => {
    const declared = new Set(flatten(MSG))
    expect(sourceKeys.filter((key) => !declared.has(key))).toEqual([])
  })

  it("translates every source key in every locale", () => {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      const missing = sourceKeys.filter((key) => !(key in catalog))
      expect(missing, `locale ${locale}`).toEqual([])
    }
  })
})

describe("resolveLocale", () => {
  it("prefers the user's stored locale", () => {
    expect(resolveLocale(LOCALE.cs, "en-GB,en;q=0.9", LOCALE.en)).toBe(LOCALE.cs)
  })

  it("falls back to Accept-Language when the user has none", () => {
    expect(resolveLocale(null, "cs-CZ,cs;q=0.9,en;q=0.8", LOCALE.en)).toBe(LOCALE.cs)
  })

  it("falls back to the configured default when nothing matches", () => {
    expect(resolveLocale(null, "fr-FR,fr;q=0.9", LOCALE.en)).toBe(LOCALE.en)
  })

  it("ignores an unsupported stored locale", () => {
    expect(resolveLocale("de", "fr", LOCALE.en)).toBe(LOCALE.en)
  })
})

describe("Translator", () => {
  const render = (key: string, params: Record<string, string | number>, locale: "en" | "cs") =>
    Effect.runSync(
      Effect.gen(function* () {
        const translator = yield* Translator
        return translator.render(key, params, locale)
      }).pipe(Effect.provide(Translator.Default)),
    )

  it("renders the requested locale", () => {
    expect(render(MSG.notifications.viewRun, {}, LOCALE.cs)).toBe("Zobrazit změnu")
    expect(render(MSG.notifications.viewRun, {}, LOCALE.en)).toBe("See what changed")
  })

  it("interpolates ICU parameters", () => {
    expect(render(MSG.errors.rateLimited, { seconds: 30 }, LOCALE.en)).toContain("30")
  })

  it("selects the plural form per locale", () => {
    expect(render(MSG.errors.planLimitExceeded, { limit: 1 }, LOCALE.en)).toContain("1 monitor")
    expect(render(MSG.errors.planLimitExceeded, { limit: 5 }, LOCALE.en)).toContain("5 monitors")
    expect(render(MSG.errors.planLimitExceeded, { limit: 3 }, LOCALE.cs)).toContain("3 monitorů")
  })

  it("returns the key when it is unknown", () => {
    expect(render("errors.doesNotExist", {}, LOCALE.en)).toBe("errors.doesNotExist")
  })
})

describe("ICU formatting", () => {
  it("pluralises in English", () => {
    const message = catalogs.en["errors.planLimitExceeded"]
    expect(message).toContain("plural")
  })

  it("pluralises in Czech with a few form", () => {
    const message = catalogs.cs["errors.planLimitExceeded"]
    expect(message).toContain("few")
  })
})
