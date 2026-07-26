import { describe, expect, it } from "vitest"

import { evaluateRobots, parseRobotsTxt } from "./robots.parser.js"

describe("parseRobotsTxt", () => {
  it("parses a single group with disallow rules", () => {
    const ruleSet = parseRobotsTxt(
      ["User-agent: *", "Disallow: /admin", "Disallow: /private/"].join("\n"),
    )
    expect(ruleSet.groups).toHaveLength(1)
    expect(ruleSet.groups[0]?.agents).toEqual(["*"])
    expect(ruleSet.groups[0]?.rules).toEqual([
      { path: "/admin", allow: false },
      { path: "/private/", allow: false },
    ])
  })

  it("groups consecutive user-agent lines together", () => {
    const ruleSet = parseRobotsTxt(["User-agent: a", "User-agent: b", "Disallow: /x"].join("\n"))
    expect(ruleSet.groups).toHaveLength(1)
    expect(ruleSet.groups[0]?.agents).toEqual(["a", "b"])
  })

  it("starts a new group after a directive was already seen", () => {
    const ruleSet = parseRobotsTxt(
      ["User-agent: a", "Disallow: /x", "User-agent: b", "Disallow: /y"].join("\n"),
    )
    expect(ruleSet.groups).toHaveLength(2)
    expect(ruleSet.groups[0]?.agents).toEqual(["a"])
    expect(ruleSet.groups[1]?.agents).toEqual(["b"])
  })

  it("ignores comments and blank lines", () => {
    const ruleSet = parseRobotsTxt(
      ["# a comment", "", "User-agent: *  # trailing comment", "Disallow: /x # noise"].join("\n"),
    )
    expect(ruleSet.groups[0]?.agents).toEqual(["*"])
    expect(ruleSet.groups[0]?.rules).toEqual([{ path: "/x", allow: false }])
  })

  it("treats an empty Disallow as no restriction", () => {
    const ruleSet = parseRobotsTxt(["User-agent: *", "Disallow:"].join("\n"))
    expect(ruleSet.groups[0]?.rules).toEqual([])
  })

  it("parses crawl-delay as a number", () => {
    const ruleSet = parseRobotsTxt(["User-agent: *", "Crawl-delay: 10"].join("\n"))
    expect(ruleSet.groups[0]?.crawlDelaySeconds).toBe(10)
  })

  it("ignores directives before any user-agent line", () => {
    const ruleSet = parseRobotsTxt(["Disallow: /x", "User-agent: *", "Disallow: /y"].join("\n"))
    expect(ruleSet.groups).toHaveLength(1)
    expect(ruleSet.groups[0]?.rules).toEqual([{ path: "/y", allow: false }])
  })
})

describe("evaluateRobots", () => {
  it("allows everything when there is no matching group", () => {
    const ruleSet = parseRobotsTxt(["User-agent: googlebot", "Disallow: /"].join("\n"))
    expect(evaluateRobots(ruleSet, "ScraperBot", "/anything")).toEqual({
      allowed: true,
      crawlDelaySeconds: null,
    })
  })

  it("blocks a disallowed prefix", () => {
    const ruleSet = parseRobotsTxt(["User-agent: *", "Disallow: /admin"].join("\n"))
    expect(evaluateRobots(ruleSet, "ScraperBot", "/admin/settings").allowed).toBe(false)
    expect(evaluateRobots(ruleSet, "ScraperBot", "/public").allowed).toBe(true)
  })

  it("lets the longest matching rule win", () => {
    const ruleSet = parseRobotsTxt(
      ["User-agent: *", "Disallow: /docs", "Allow: /docs/public"].join("\n"),
    )
    expect(evaluateRobots(ruleSet, "ScraperBot", "/docs/public/page").allowed).toBe(true)
    expect(evaluateRobots(ruleSet, "ScraperBot", "/docs/private").allowed).toBe(false)
  })

  it("prefers a specific user-agent group over the wildcard", () => {
    const ruleSet = parseRobotsTxt(
      ["User-agent: *", "Disallow: /", "User-agent: ScraperBot", "Allow: /"].join("\n"),
    )
    expect(evaluateRobots(ruleSet, "ScraperBot", "/anything").allowed).toBe(true)
    expect(evaluateRobots(ruleSet, "OtherBot", "/anything").allowed).toBe(false)
  })

  it("supports wildcard segments in a rule path", () => {
    const ruleSet = parseRobotsTxt(["User-agent: *", "Disallow: /*.pdf$"].join("\n"))
    expect(evaluateRobots(ruleSet, "ScraperBot", "/file.pdf").allowed).toBe(false)
    expect(evaluateRobots(ruleSet, "ScraperBot", "/file.pdf.html").allowed).toBe(true)
  })

  it("carries the group's crawl delay alongside the decision", () => {
    const ruleSet = parseRobotsTxt(["User-agent: *", "Crawl-delay: 5", "Disallow: /x"].join("\n"))
    expect(evaluateRobots(ruleSet, "ScraperBot", "/ok")).toEqual({
      allowed: true,
      crawlDelaySeconds: 5,
    })
  })

  it("allows everything against an empty rule set", () => {
    expect(evaluateRobots({ groups: [] }, "ScraperBot", "/x")).toEqual({
      allowed: true,
      crawlDelaySeconds: null,
    })
  })
})
