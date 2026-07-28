import { Effect, Exit } from "effect"
import { describe, expect, it } from "vitest"

import { scopeDocument, selectRaw, type ExtractorSpec } from "./extraction.js"

const HTML = `
<html>
  <body>
    <section id="main">
      <div class="price">$19.99</div>
      <div class="price sale">$9.99</div>
      <ul class="tags">
        <li>new</li>
        <li>sale</li>
      </ul>
      <script type="application/ld+json">
        { "@type": "Product", "name": "Widget", "offers": { "price": "9.99", "priceCurrency": "USD" } }
      </script>
    </section>
    <aside>
      <div class="price">$1.00</div>
    </aside>
  </body>
</html>
`

const extractor = (overrides: Partial<ExtractorSpec>): ExtractorSpec => ({
  selectorKind: "css",
  selector: "",
  attribute: null,
  occurrence: "first",
  occurrenceIndex: null,
  ...overrides,
})

const run = (html: string, contentSelector: string | null, spec: ExtractorSpec) =>
  Effect.runPromiseExit(selectRaw(scopeDocument(html, contentSelector), html, spec))

describe("selectRaw / css", () => {
  it("reads text content of the first match by default", async () => {
    const exit = await run(HTML, null, extractor({ selectorKind: "css", selector: ".price" }))
    expect(exit).toEqual(
      Exit.succeed({ raw: "$19.99", rawList: null, missing: false, matchCount: 3 }),
    )
  })

  it("reads the last match", async () => {
    const exit = await run(
      HTML,
      null,
      extractor({ selectorKind: "css", selector: ".price", occurrence: "last" }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: "$1.00", rawList: null, missing: false, matchCount: 3 }),
    )
  })

  it("reads a specific nth match", async () => {
    const exit = await run(
      HTML,
      null,
      extractor({ selectorKind: "css", selector: ".price", occurrence: "nth", occurrenceIndex: 1 }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: "$9.99", rawList: null, missing: false, matchCount: 3 }),
    )
  })

  it("reads all matches as a list", async () => {
    const exit = await run(
      HTML,
      null,
      extractor({ selectorKind: "css", selector: ".price", occurrence: "all" }),
    )
    expect(exit).toEqual(
      Exit.succeed({
        raw: null,
        rawList: ["$19.99", "$9.99", "$1.00"],
        missing: false,
        matchCount: 3,
      }),
    )
  })

  it("reads an attribute instead of text when configured", async () => {
    const withAttribute = '<a class="link" href="/product/1">Buy</a>'
    const exit = await run(
      withAttribute,
      null,
      extractor({ selectorKind: "css", selector: ".link", attribute: "href" }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: "/product/1", rawList: null, missing: false, matchCount: 1 }),
    )
  })

  it("reports missing when nothing matches", async () => {
    const exit = await run(HTML, null, extractor({ selectorKind: "css", selector: ".nonexistent" }))
    expect(exit).toEqual(Exit.succeed({ raw: null, rawList: null, missing: true, matchCount: 0 }))
  })

  it("respects the content_selector scope", async () => {
    const exit = await run(
      HTML,
      "#main",
      extractor({ selectorKind: "css", selector: ".price", occurrence: "all" }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: null, rawList: ["$19.99", "$9.99"], missing: false, matchCount: 2 }),
    )
  })

  it("fails with SelectorInvalid on malformed css", async () => {
    const exit = await run(HTML, null, extractor({ selectorKind: "css", selector: "[unclosed" }))
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("SelectorInvalid")
    }
  })
})

describe("selectRaw / xpath", () => {
  it("reads matching text via a lite xpath expression", async () => {
    const exit = await run(HTML, null, extractor({ selectorKind: "xpath", selector: "//li[1]" }))
    expect(exit).toEqual(Exit.succeed({ raw: "new", rawList: null, missing: false, matchCount: 1 }))
  })
})

describe("selectRaw / regex", () => {
  it("captures group 1 from the scoped html", async () => {
    const exit = await run(
      HTML,
      null,
      extractor({
        selectorKind: "regex",
        selector: String.raw`\$(\d+\.\d{2})`,
        occurrence: "first",
      }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: "19.99", rawList: null, missing: false, matchCount: 3 }),
    )
  })

  it("collects every match with occurrence all", async () => {
    const exit = await run(
      HTML,
      null,
      extractor({ selectorKind: "regex", selector: String.raw`\$(\d+\.\d{2})`, occurrence: "all" }),
    )
    expect(exit).toEqual(
      Exit.succeed({
        raw: null,
        rawList: ["19.99", "9.99", "1.00"],
        missing: false,
        matchCount: 3,
      }),
    )
  })
})

describe("selectRaw / json_ld", () => {
  it("reads a field out of the embedded json-ld document", async () => {
    const exit = await run(
      HTML,
      null,
      extractor({ selectorKind: "json_ld", selector: "$.offers.price" }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: "9.99", rawList: null, missing: false, matchCount: 1 }),
    )
  })
})

describe("selectRaw / jsonpath", () => {
  const jsonBody = JSON.stringify({ product: { price: 42.5, tags: ["a", "b"] } })

  it("reads a value from a json response body", async () => {
    const exit = await run(
      jsonBody,
      null,
      extractor({ selectorKind: "jsonpath", selector: "$.product.price" }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: "42.5", rawList: null, missing: false, matchCount: 1 }),
    )
  })

  it("reads a list from a json response body", async () => {
    const exit = await run(
      jsonBody,
      null,
      extractor({ selectorKind: "jsonpath", selector: "$.product.tags[*]", occurrence: "all" }),
    )
    expect(exit).toEqual(
      Exit.succeed({ raw: null, rawList: ["a", "b"], missing: false, matchCount: 2 }),
    )
  })
})

describe("selectRaw / whole_page", () => {
  it("returns the scoped html untouched", async () => {
    const exit = await run(
      "<section id='x'><p>hello</p></section>",
      "#x",
      extractor({ selectorKind: "whole_page", selector: "" }),
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.raw).toContain("hello")
    }
  })
})
