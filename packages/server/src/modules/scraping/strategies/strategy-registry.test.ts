import { describe, expect, it } from "vitest"

import { resolveStrategy } from "./strategy-registry.js"
import type { ScrapeStrategy } from "./strategy.types.js"

const http = { kind: "http" } as ScrapeStrategy
const browser = { kind: "browser" } as ScrapeStrategy
const dependencies = { http, browser }

describe("resolveStrategy", () => {
  it("uses http when the engine is explicitly http", () => {
    expect(resolveStrategy({ engine: "http", engineResolved: null }, dependencies)).toBe(http)
  })

  it("uses browser when the engine is explicitly browser", () => {
    expect(resolveStrategy({ engine: "browser", engineResolved: null }, dependencies)).toBe(browser)
  })

  it("prefers http on auto with nothing pinned yet", () => {
    expect(resolveStrategy({ engine: "auto", engineResolved: null }, dependencies)).toBe(http)
  })

  it("goes straight to the pinned browser strategy on auto", () => {
    expect(resolveStrategy({ engine: "auto", engineResolved: "browser" }, dependencies)).toBe(
      browser,
    )
  })

  it("stays on http on auto once pinned to http", () => {
    expect(resolveStrategy({ engine: "auto", engineResolved: "http" }, dependencies)).toBe(http)
  })
})
