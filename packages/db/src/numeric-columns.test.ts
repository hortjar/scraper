import { describe, expect, it } from "vitest"

import { toDomainChange, withNumericColumns } from "./numeric-columns.js"

describe("toDomainChange", () => {
  it("parses the numeric columns postgres returns as strings", () => {
    const row = {
      changeKind: "decreased",
      oldNumber: "129.00",
      newNumber: "99.00",
      deltaAbsolute: "-30.00",
      deltaPercent: "-23.26",
    }

    expect(toDomainChange(row)).toEqual({
      changeKind: "decreased",
      oldNumber: 129,
      newNumber: 99,
      deltaAbsolute: -30,
      deltaPercent: -23.26,
    })
  })

  it("leaves a text-only change untouched", () => {
    const row = {
      changeKind: "modified",
      oldValue: "in stock",
      newValue: "sold out",
      oldNumber: null,
      newNumber: null,
      deltaAbsolute: null,
      deltaPercent: null,
    }

    expect(toDomainChange(row)).toEqual(row)
  })

  it("does not invent columns the query did not select", () => {
    expect(toDomainChange({ oldNumber: "1" })).toEqual({ oldNumber: 1 })
  })

  it("maps an unparseable value to null rather than NaN", () => {
    expect(toDomainChange({ oldNumber: "not-a-number" })).toEqual({ oldNumber: null })
  })

  it("passes numbers through so a driver that already parses stays correct", () => {
    expect(withNumericColumns({ value: 42 }, ["value"])).toEqual({ value: 42 })
  })
})
