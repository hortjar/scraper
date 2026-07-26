import { describe, expect, it } from "vitest"

import { coerceList, coerceScalar, missingField, type CoerceSpec } from "./coerce.js"

const spec = (valueType: CoerceSpec["valueType"]): CoerceSpec => ({
  key: "field" as CoerceSpec["key"],
  valueType,
})

describe("coerceScalar", () => {
  it("parses a number value type", () => {
    const field = coerceScalar(spec("number"), "1,299", "1299")
    expect(field.valueNumber).toBe(1299)
    expect(field.valueText).toBe("1299")
    expect(field.missing).toBe(false)
  })

  it("parses a price value type", () => {
    const field = coerceScalar(spec("price"), "$19.99", "19.99 USD")
    expect(field.valueNumber).toBe(19.99)
  })

  it("returns null for an unparseable number", () => {
    const field = coerceScalar(spec("number"), "n/a", "n/a")
    expect(field.valueNumber).toBeNull()
  })

  it("parses truthy boolean text", () => {
    expect(coerceScalar(spec("boolean"), "In stock", "In stock").valueBool).toBe(true)
    expect(coerceScalar(spec("boolean"), "Yes", "yes").valueBool).toBe(true)
  })

  it("parses falsy boolean text", () => {
    expect(coerceScalar(spec("boolean"), "Sold out", "Sold out").valueBool).toBe(false)
  })

  it("keeps text as-is for a text value type", () => {
    const field = coerceScalar(spec("text"), "Hello", "Hello")
    expect(field.valueText).toBe("Hello")
    expect(field.valueNumber).toBeNull()
  })
})

describe("coerceList", () => {
  it("returns every item as the list value", () => {
    const field = coerceList(spec("list"), null, ["a", "b", "c"])
    expect(field.valueList).toEqual(["a", "b", "c"])
    expect(field.missing).toBe(false)
  })
})

describe("missingField", () => {
  it("flags missing without a value", () => {
    const field = missingField(spec("text"), null)
    expect(field.missing).toBe(true)
    expect(field.valueText).toBeNull()
  })
})
