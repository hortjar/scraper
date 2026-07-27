import { VALUE_TYPE } from "@scraper/core/constants"
import type { ExtractorKey } from "@scraper/core/domain"
import { describe, expect, it } from "vitest"

import { diffField, diffWholePage, listDifference, percentChange } from "./field-diff.js"
import type { FieldSnapshot } from "./field-diff.js"

const KEY = "price" as ExtractorKey

const absent: FieldSnapshot = {
  valueText: null,
  valueNumber: null,
  valueBool: null,
  valueList: null,
  missing: true,
}

const text = (value: string): FieldSnapshot => ({ ...absent, valueText: value, missing: false })
const number = (value: number): FieldSnapshot => ({ ...absent, valueNumber: value, missing: false })
const flag = (isSet: boolean): FieldSnapshot => ({ ...absent, valueBool: isSet, missing: false })
const list = (...values: string[]): FieldSnapshot => ({
  ...absent,
  valueList: values,
  missing: false,
})

describe("presence", () => {
  it("reports a field that started being found as appeared", () => {
    const [change] = diffField(KEY, VALUE_TYPE.text, absent, text("in stock"))

    expect(change?.changeKind).toBe("appeared")
    expect(change?.newValue).toBe("in stock")
  })

  it("reports a field that stopped being found as disappeared", () => {
    const [change] = diffField(KEY, VALUE_TYPE.text, text("in stock"), absent)

    expect(change?.changeKind).toBe("disappeared")
    expect(change?.oldValue).toBe("in stock")
  })

  it("reports nothing when the field is missing on both sides", () => {
    expect(diffField(KEY, VALUE_TYPE.text, absent, absent)).toEqual([])
  })
})

describe("numeric fields", () => {
  it("records the direction, the absolute delta and the percentage", () => {
    const [change] = diffField(KEY, VALUE_TYPE.price, number(200), number(150))

    expect(change?.changeKind).toBe("decreased")
    expect(change?.deltaAbsolute).toBe(-50)
    expect(change?.deltaPercent).toBe(-25)
    expect(change?.oldNumber).toBe(200)
    expect(change?.newNumber).toBe(150)
  })

  it("records an increase", () => {
    const [change] = diffField(KEY, VALUE_TYPE.number, number(10), number(12))

    expect(change?.changeKind).toBe("increased")
    expect(change?.deltaAbsolute).toBe(2)
  })

  it("reports nothing when the number is unchanged", () => {
    expect(diffField(KEY, VALUE_TYPE.number, number(10), number(10))).toEqual([])
  })

  it("leaves the percentage undefined when the previous value was zero", () => {
    const [change] = diffField(KEY, VALUE_TYPE.number, number(0), number(5))

    expect(change?.deltaPercent).toBeNull()
    expect(change?.deltaAbsolute).toBe(5)
  })
})

describe("percentChange", () => {
  it("uses the magnitude of the previous value, so a rise from a negative is positive", () => {
    expect(percentChange(-50, -25)).toBe(50)
  })
})

describe("boolean fields", () => {
  it("treats false to true as appeared", () => {
    expect(diffField(KEY, VALUE_TYPE.boolean, flag(false), flag(true))[0]?.changeKind).toBe(
      "appeared",
    )
  })

  it("treats true to false as disappeared", () => {
    expect(diffField(KEY, VALUE_TYPE.boolean, flag(true), flag(false))[0]?.changeKind).toBe(
      "disappeared",
    )
  })
})

describe("list fields", () => {
  it("ignores reordering", () => {
    expect(diffField(KEY, VALUE_TYPE.list, list("a", "b"), list("b", "a"))).toEqual([])
  })

  it("reports additions and removals as separate changes", () => {
    const changes = diffField(KEY, VALUE_TYPE.list, list("a", "b"), list("b", "c"))

    expect(changes.map((change) => change.changeKind)).toEqual(["disappeared", "appeared"])
    expect(changes[0]?.oldValue).toBe("a")
    expect(changes[1]?.newValue).toBe("c")
  })
})

describe("text fields", () => {
  it("records a modification with a diff", () => {
    const [change] = diffField(KEY, VALUE_TYPE.text, text("in stock"), text("sold out"))

    expect(change?.changeKind).toBe("modified")
    expect(change?.diff?.length).toBeGreaterThan(0)
  })

  it("reports nothing when the text is identical", () => {
    expect(diffField(KEY, VALUE_TYPE.text, text("same"), text("same"))).toEqual([])
  })
})

describe("diffWholePage", () => {
  it("produces one keyless modification carrying the diff", () => {
    const [change] = diffWholePage("old body", "new body")

    expect(change?.extractorKey).toBeNull()
    expect(change?.changeKind).toBe("modified")
    expect(change?.diff?.length).toBeGreaterThan(0)
  })

  it("produces nothing when the page is identical", () => {
    expect(diffWholePage("same", "same")).toEqual([])
  })
})

describe("listDifference", () => {
  it("keeps duplicates on the side that has them", () => {
    expect(listDifference(["a"], ["a", "a", "b"])).toEqual({ added: ["b"], removed: [] })
  })
})
