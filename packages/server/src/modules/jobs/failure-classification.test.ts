import { describe, expect, it } from "vitest"

import { describeFailure, isRetryableFailure } from "./failure-classification.js"

describe("isRetryableFailure", () => {
  it("treats infra failures without a retryable flag as retryable", () => {
    expect(isRetryableFailure({ _tag: "DatabaseError", cause: new Error("x") })).toBe(true)
    expect(isRetryableFailure({ _tag: "QueueUnavailable", queue: "scrape" })).toBe(true)
  })

  it("honors an explicit retryable flag over the default", () => {
    expect(isRetryableFailure({ _tag: "ScrapeFailed", retryable: true })).toBe(true)
    expect(isRetryableFailure({ _tag: "ScrapeFailed", retryable: false })).toBe(false)
  })

  it("defaults an unknown tagged error to terminal, not retryable", () => {
    expect(isRetryableFailure({ _tag: "MonitorNotFound", id: "x" })).toBe(false)
  })

  it("defaults a non-tagged value to terminal", () => {
    expect(isRetryableFailure(new Error("boom"))).toBe(false)
    expect(isRetryableFailure("boom")).toBe(false)
    expect(isRetryableFailure(null)).toBe(false)
  })
})

describe("describeFailure", () => {
  it("prefers the tagged error's tag", () => {
    expect(describeFailure({ _tag: "MonitorNotFound", id: "x" })).toBe("MonitorNotFound")
  })

  it("falls back to the error message when untagged", () => {
    expect(describeFailure(new Error("boom"))).toBe("boom")
  })

  it("falls back to a generic label for anything else", () => {
    expect(describeFailure("boom")).toBe("unknown_failure")
  })
})
