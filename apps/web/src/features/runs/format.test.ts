import { describe, expect, it } from "vitest"

import { CHANGE_KIND, RUN_STATUS } from "./constants"
import {
  CHANGE_KIND_KEY,
  CHANGE_KIND_TONE,
  RUN_STATUS_KEY,
  RUN_STATUS_TONE,
  isFailedStatus,
  isNumericChangeKind,
  percentToRatio,
} from "./format"

describe("run status formatting", () => {
  it("has a translation key and a tone for every run status", () => {
    for (const status of Object.values(RUN_STATUS)) {
      expect(RUN_STATUS_KEY[status]).toMatch(/^status\./)
      expect(RUN_STATUS_TONE[status]).toBeTruthy()
    }
  })

  it("flags only failed as a failure", () => {
    expect(isFailedStatus(RUN_STATUS.failed)).toBe(true)
    expect(isFailedStatus(RUN_STATUS.success)).toBe(false)
    expect(isFailedStatus(RUN_STATUS.running)).toBe(false)
    expect(isFailedStatus(RUN_STATUS.skipped)).toBe(false)
  })
})

describe("change kind formatting", () => {
  it("has a translation key and a tone for every change kind", () => {
    for (const kind of Object.values(CHANGE_KIND)) {
      expect(CHANGE_KIND_KEY[kind]).toMatch(/^changeKind\./)
      expect(CHANGE_KIND_TONE[kind]).toBeTruthy()
    }
  })

  it("treats increased/decreased as numeric, and the rest as not", () => {
    expect(isNumericChangeKind(CHANGE_KIND.increased)).toBe(true)
    expect(isNumericChangeKind(CHANGE_KIND.decreased)).toBe(true)
    expect(isNumericChangeKind(CHANGE_KIND.appeared)).toBe(false)
    expect(isNumericChangeKind(CHANGE_KIND.disappeared)).toBe(false)
    expect(isNumericChangeKind(CHANGE_KIND.modified)).toBe(false)
  })

  it("gives increased a positive tone and decreased a negative one", () => {
    expect(CHANGE_KIND_TONE[CHANGE_KIND.increased]).toBe("positive")
    expect(CHANGE_KIND_TONE[CHANGE_KIND.decreased]).toBe("negative")
  })
})

describe("percentToRatio", () => {
  it("converts a backend percent (already ×100) into an Intl percent-style ratio", () => {
    expect(percentToRatio(50)).toBeCloseTo(0.5)
    expect(percentToRatio(-23.26)).toBeCloseTo(-0.2326)
    expect(percentToRatio(0)).toBe(0)
  })
})
