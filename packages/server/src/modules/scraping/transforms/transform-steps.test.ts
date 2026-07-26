import type { Transform } from "@scraper/core"
import { Either } from "effect"
import { describe, expect, it } from "vitest"

import { applyStep } from "./transform-steps.js"

const right = (value: string): unknown => expect.objectContaining({ _tag: "Right", right: value })
const left = (value: string): unknown => expect.objectContaining({ _tag: "Left", left: value })

describe("applyStep", () => {
  it("trim", () => {
    expect(applyStep("  hi  ", { kind: "trim" })).toEqual(right("hi"))
  })

  it("lowercase", () => {
    expect(applyStep("HeLLo", { kind: "lowercase" })).toEqual(right("hello"))
  })

  it("uppercase", () => {
    expect(applyStep("HeLLo", { kind: "uppercase" })).toEqual(right("HELLO"))
  })

  it("collapse_whitespace", () => {
    expect(applyStep("a   b\n\nc", { kind: "collapse_whitespace" })).toEqual(right("a b c"))
  })

  it("strip_html", () => {
    const input = "<div>Hello <b>world</b><script>evil()</script><!-- gone --></div>"
    expect(applyStep(input, { kind: "strip_html" })).toEqual(right("Hello world"))
  })

  describe("regex_extract", () => {
    it("captures the default group", () => {
      const step: Transform = { kind: "regex_extract", pattern: String.raw`Only \$([\d.]+)!` }
      expect(applyStep("Only $1299.00!", step)).toEqual(right("1299.00"))
    })

    it("captures an explicit group", () => {
      const step: Transform = { kind: "regex_extract", pattern: String.raw`(\w+)-(\w+)`, group: 2 }
      expect(applyStep("foo-bar", step)).toEqual(right("bar"))
    })

    it("fails when nothing matches", () => {
      const step: Transform = { kind: "regex_extract", pattern: "zzz" }
      expect(applyStep("abc", step)).toEqual(left("no_match"))
    })

    it("fails on an invalid pattern", () => {
      const step: Transform = { kind: "regex_extract", pattern: "(unclosed" }
      expect(applyStep("abc", step)).toEqual(left("invalid_pattern"))
    })
  })

  it("regex_replace removes noise", () => {
    const step: Transform = { kind: "regex_replace", pattern: "[^0-9]", replacement: "" }
    expect(applyStep("$1,299", step)).toEqual(right("1299"))
  })

  it("slice", () => {
    expect(applyStep("abcdef", { kind: "slice", start: 1, end: 4 })).toEqual(right("bcd"))
  })

  it("slice with no end takes the rest", () => {
    expect(applyStep("abcdef", { kind: "slice", start: 2 })).toEqual(right("cdef"))
  })

  describe("parse_number", () => {
    it("parses a plain integer", () => {
      expect(applyStep("42", { kind: "parse_number" })).toEqual(right("42"))
    })

    it("parses european formatting when configured", () => {
      const step: Transform = { kind: "parse_number", decimal: ",", thousands: "." }
      expect(applyStep("1.299,00", step)).toEqual(right("1299"))
    })

    it("fails on garbage", () => {
      expect(applyStep("not a number", { kind: "parse_number" })).toEqual(left("not_a_number"))
    })
  })

  describe("parse_price", () => {
    it("infers us formatting and detects the dollar sign", () => {
      expect(applyStep("$1,299.00", { kind: "parse_price" })).toEqual(right("1299 USD"))
    })

    it("infers european formatting from the trailing comma", () => {
      expect(applyStep("1.299,00 €", { kind: "parse_price" })).toEqual(right("1299 EUR"))
    })

    it("honors an explicit currency override", () => {
      const step: Transform = { kind: "parse_price", currency: "CZK" }
      expect(applyStep("999", step)).toEqual(right("999 CZK"))
    })

    it("omits the currency when none is detected", () => {
      expect(applyStep("19.99", { kind: "parse_price" })).toEqual(right("19.99"))
    })
  })

  describe("parse_date", () => {
    it("normalizes to iso", () => {
      const result = applyStep("2024-01-15", { kind: "parse_date" })
      expect(Either.isRight(result)).toBe(true)
      if (Either.isRight(result)) expect(result.right.startsWith("2024-01-15")).toBe(true)
    })

    it("fails on an unparseable date", () => {
      expect(applyStep("not a date", { kind: "parse_date" })).toEqual(left("invalid_date"))
    })
  })

  describe("map_values", () => {
    it("maps a known value", () => {
      const step: Transform = {
        kind: "map_values",
        mapping: { "In stock": "true", "Sold out": "false" },
      }
      expect(applyStep("In stock", step)).toEqual(right("true"))
    })

    it("fails on an unmapped value", () => {
      const step: Transform = { kind: "map_values", mapping: { "In stock": "true" } }
      expect(applyStep("Backordered", step)).toEqual(left("unmapped_value"))
    })
  })

  describe("default", () => {
    it("passes through a non-empty value", () => {
      expect(applyStep("hello", { kind: "default", value: "fallback" })).toEqual(right("hello"))
    })

    it("substitutes the default for an empty value", () => {
      expect(applyStep("", { kind: "default", value: "fallback" })).toEqual(right("fallback"))
    })
  })

  describe("json_path", () => {
    it("extracts a field from an inline json blob", () => {
      const step: Transform = { kind: "json_path", path: "$.price" }
      expect(applyStep('{"price": 9.99}', step)).toEqual(right("9.99"))
    })

    it("fails on invalid json", () => {
      const step: Transform = { kind: "json_path", path: "$.price" }
      expect(applyStep("not json", step)).toEqual(left("invalid_json"))
    })

    it("fails when the path has no match", () => {
      const step: Transform = { kind: "json_path", path: "$.missing" }
      expect(applyStep('{"price": 9.99}', step)).toEqual(left("no_match"))
    })
  })
})
