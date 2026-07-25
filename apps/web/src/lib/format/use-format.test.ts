import { describe, expect, it } from "vitest"

import { createFormat } from "./use-format"

const format = createFormat("en-GB", "UTC")

describe("createFormat", () => {
  it("formats dates in the given time zone", () => {
    expect(format.dateTime("2026-03-04T09:30:00Z")).toContain("2026")
  })

  it("returns an empty string for an unparseable date", () => {
    expect(format.date("not-a-date")).toBe("")
  })

  it("formats relative time against an explicit origin", () => {
    const from = new Date("2026-03-04T12:00:00Z")
    expect(format.relative("2026-03-04T11:00:00Z", from)).toBe("1 hour ago")
    expect(format.relative("2026-03-05T12:00:00Z", from)).toBe("tomorrow")
  })

  it("formats percentages from a ratio", () => {
    expect(format.percent(-0.233)).toBe("-23.3%")
  })

  it("formats byte sizes with SI units", () => {
    expect(format.bytes(0)).toBe("0 byte")
    expect(format.bytes(1500)).toBe("1.5 kB")
    expect(format.bytes(2_400_000)).toBe("2.4 MB")
  })

  it("formats durations", () => {
    expect(format.duration(450)).toBe("450 ms")
    expect(format.duration(90_000)).toBe("1.5 mins")
  })
})
