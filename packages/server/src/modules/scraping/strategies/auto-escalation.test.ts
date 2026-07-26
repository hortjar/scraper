import { describe, expect, it } from "vitest"

import { isChallengePage, isLikelySpaShell, shouldEscalate } from "./auto-escalation.js"

describe("isLikelySpaShell", () => {
  it("flags a tiny document with a react root", () => {
    expect(isLikelySpaShell('<div id="root"></div>', 200)).toBe(true)
  })

  it("flags a tiny next.js shell", () => {
    expect(isLikelySpaShell("<script>window.__NEXT_DATA__ = {}</script>", 300)).toBe(true)
  })

  it("does not flag a large document even with a marker", () => {
    const html = `<div id="root"></div>${"x".repeat(10_000)}`
    expect(isLikelySpaShell(html, 10_000)).toBe(false)
  })

  it("does not flag a small document with real content", () => {
    expect(isLikelySpaShell("<p>Hello world</p>", 50)).toBe(false)
  })
})

describe("isChallengePage", () => {
  it("recognizes a cloudflare interstitial on 403", () => {
    expect(isChallengePage(403, "Checking your browser before accessing")).toBe(true)
  })

  it("recognizes a captcha wall on 429", () => {
    expect(isChallengePage(429, "captcha-delivery required")).toBe(true)
  })

  it("ignores a normal 403 without a known signature", () => {
    expect(isChallengePage(403, "<h1>403 Forbidden</h1>")).toBe(false)
  })

  it("ignores a 200 even with matching text", () => {
    expect(isChallengePage(200, "checking your browser")).toBe(false)
  })
})

describe("shouldEscalate", () => {
  const base = {
    httpStatus: 200,
    html: "<p>content</p>",
    byteLength: 5000,
    allRequiredExtractorsMissing: false,
  }

  it("escalates when all required extractors are missing", () => {
    expect(shouldEscalate({ ...base, allRequiredExtractorsMissing: true })).toBe(true)
  })

  it("escalates on a small spa shell", () => {
    expect(shouldEscalate({ ...base, html: '<div id="root"></div>', byteLength: 100 })).toBe(true)
  })

  it("escalates on a challenge page", () => {
    expect(
      shouldEscalate({ ...base, httpStatus: 503, html: "DDoS protection by some vendor" }),
    ).toBe(true)
  })

  it("does not escalate a normal successful page", () => {
    expect(shouldEscalate(base)).toBe(false)
  })
})
