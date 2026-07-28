import { MSG, type Extractor } from "@scraper/core"
import { describe, expect, it } from "vitest"

import type { RawExtraction } from "./extraction/extraction.js"
import { selectorWarnings } from "./scrape-and-extract.js"

const extractor = (overrides: Partial<Extractor> = {}): Extractor =>
  ({
    id: "00000000-0000-4000-8000-000000000001",
    monitorId: "00000000-0000-4000-8000-000000000002",
    key: "price",
    label: "Price",
    selectorKind: "css",
    selector: ".price",
    attribute: null,
    valueType: "text",
    transforms: [],
    occurrence: "first",
    occurrenceIndex: null,
    required: true,
    position: 0,
    ...overrides,
  }) as Extractor

const raw = (matchCount: number): RawExtraction => ({
  raw: matchCount === 0 ? null : "value",
  rawList: null,
  missing: matchCount === 0,
  matchCount,
})

describe("selectorWarnings", () => {
  it("warns when a selector matched nothing", () => {
    const warnings = selectorWarnings([extractor()], [raw(0)])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.messageKey).toBe(MSG.warnings.selectorNoMatch)
    expect(warnings[0]?.params).toEqual({ field: "Price" })
  })

  it("warns when a selector matched more than one node and only one is used", () => {
    const warnings = selectorWarnings([extractor()], [raw(4)])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.messageKey).toBe(MSG.warnings.selectorManyMatches)
    expect(warnings[0]?.params).toEqual({ field: "Price", count: "4" })
  })

  it("stays quiet when many matches are all wanted", () => {
    expect(selectorWarnings([extractor({ occurrence: "all" })], [raw(4)])).toEqual([])
  })

  it("stays quiet on exactly one match", () => {
    expect(selectorWarnings([extractor()], [raw(1)])).toEqual([])
  })

  it("still reports no-match for an occurrence:all extractor", () => {
    const warnings = selectorWarnings([extractor({ occurrence: "all" })], [raw(0)])
    expect(warnings[0]?.messageKey).toBe(MSG.warnings.selectorNoMatch)
  })

  it("reports one warning per extractor", () => {
    const warnings = selectorWarnings(
      [extractor(), extractor({ key: "title", label: "Title" } as Partial<Extractor>)],
      [raw(0), raw(3)],
    )
    expect(warnings.map((warning) => warning.messageKey)).toEqual([
      MSG.warnings.selectorNoMatch,
      MSG.warnings.selectorManyMatches,
    ])
  })
})
