import { describe, expect, it } from "vitest"

import { parseFragment, queryAll } from "./dom.types.js"

const FULL_DOCUMENT =
  "<!doctype html><html><head><title>T</title></head><body><h1>Hi</h1></body></html>"

describe("parseFragment", () => {
  it("queries a complete html document without walking off the end of the node list", () => {
    const { body } = parseFragment(FULL_DOCUMENT)

    expect(queryAll(body, "h1")).toHaveLength(1)
    expect(queryAll(body, "h1")[0]?.textContent).toBe("Hi")
  })

  it("keeps every root of a multi-root fragment", () => {
    const { body } = parseFragment("<div>a</div><div>b</div>")

    expect(queryAll(body, "div")).toHaveLength(2)
  })

  it("keeps a single-element fragment", () => {
    const { body } = parseFragment("<h1>Hi</h1>")

    expect(queryAll(body, "h1")[0]?.textContent).toBe("Hi")
  })

  it("accepts text with no markup at all", () => {
    const { body } = parseFragment("just text")

    expect(body.textContent).toBe("just text")
    expect(queryAll(body, "*")).toHaveLength(0)
  })

  it("accepts empty input", () => {
    const { body } = parseFragment("")

    expect(queryAll(body, "*")).toHaveLength(0)
  })

  it("handles a document with an uppercase doctype and leading whitespace", () => {
    const { body } = parseFragment(`\n  <!DOCTYPE HTML><html><body><p>x</p></body></html>`)

    expect(queryAll(body, "p")).toHaveLength(1)
  })
})
