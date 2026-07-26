import type { IgnoreRule } from "@scraper/core"
import { describe, expect, it } from "vitest"

import { normalizeContent } from "./content-normalizer.js"

describe("normalizeContent", () => {
  it("strips script, style and comments", () => {
    const html = `
      <html><body>
        <style>.a{color:red}</style>
        <script>track()</script>
        <!-- a comment -->
        <p>Hello world</p>
      </body></html>
    `
    const { normalized } = normalizeContent(html, null, [])
    expect(normalized).toBe("Hello world")
  })

  it("keeps block structure as line breaks", () => {
    const html = "<div><p>First</p><p>Second</p><ul><li>A</li><li>B</li></ul></div>"
    const { normalized } = normalizeContent(html, null, [])
    expect(normalized).toBe("First\nSecond\nA\nB")
  })

  it("scopes to the content selector", () => {
    const html = `
      <html><body>
        <nav>Skip me</nav>
        <main id="content"><p>Keep me</p></main>
        <footer>Skip me too</footer>
      </body></html>
    `
    const { normalized } = normalizeContent(html, "#content", [])
    expect(normalized).toBe("Keep me")
  })

  it("removes elements matching a selector ignore rule", () => {
    const html = '<div><p>Real content</p><div class="ad">Buy now</div></div>'
    const rules: readonly IgnoreRule[] = [{ kind: "selector", value: ".ad" }]
    const { normalized } = normalizeContent(html, null, rules)
    expect(normalized).toBe("Real content")
  })

  it("blanks text matching a regex ignore rule", () => {
    const html = "<p>Updated 3 minutes ago</p><p>Price: $19.99</p>"
    const rules: readonly IgnoreRule[] = [
      { kind: "regex", value: String.raw`Updated \d+ minutes ago` },
    ]
    const { normalized } = normalizeContent(html, null, rules)
    expect(normalized).toBe("Price: $19.99")
  })

  it("decodes common html entities", () => {
    const html = "<p>Fish &amp; Chips &mdash; &quot;great&quot;</p>"
    const { normalized } = normalizeContent(html, null, [])
    expect(normalized).toContain("Fish & Chips")
    expect(normalized).toContain('"great"')
  })

  it("produces a stable sha256 hash for identical input", () => {
    const html = "<p>Same content</p>"
    const first = normalizeContent(html, null, [])
    const second = normalizeContent(html, null, [])
    expect(first.contentHash).toBe(second.contentHash)
    expect(first.contentHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("produces a different hash when content changes", () => {
    const a = normalizeContent("<p>Version A</p>", null, [])
    const b = normalizeContent("<p>Version B</p>", null, [])
    expect(a.contentHash).not.toBe(b.contentHash)
  })

  it("is unaffected by attributes outside the safe list", () => {
    const withNoise = normalizeContent(
      '<p data-cache-bust="12345" style="color:red">Stable text</p>',
      null,
      [],
    )
    const withoutNoise = normalizeContent("<p>Stable text</p>", null, [])
    expect(withNoise.contentHash).toBe(withoutNoise.contentHash)
  })

  it("is close to idempotent when re-normalizing its own output", () => {
    const html = "<div><p>First</p><p>Second paragraph here</p></div>"
    const once = normalizeContent(html, null, [])
    const twice = normalizeContent(once.normalized, null, [])
    expect(twice.normalized).toBe(once.normalized)
  })

  it("never throws on arbitrary input", () => {
    const inputs = ["", "<<<>>>", "<div", "not html at all", "<p>" + "x".repeat(5000) + "</p>"]
    for (const input of inputs) {
      expect(() => normalizeContent(input, null, [])).not.toThrow()
    }
  })
})
