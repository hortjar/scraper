import { describe, expect, it } from "vitest"

import { parseFragment, type DomElement } from "../dom.types.js"

import { evaluateXPath } from "./xpath-lite.js"

const HTML = `
<html>
  <body>
    <div class="price">$19.99</div>
    <div class="price sale">$9.99</div>
    <ul>
      <li>first</li>
      <li>second</li>
      <li>third</li>
    </ul>
    <a href="/product/1">One</a>
    <a href="/product/2">Two</a>
    <a href="/other">Other</a>
    <img alt="hero image" src="/hero.png" />
  </body>
</html>
`

const root = (): DomElement => parseFragment(HTML).body

describe("evaluateXPath", () => {
  it("selects text content of matching elements", () => {
    expect(evaluateXPath(root(), "//li")).toEqual(["first", "second", "third"])
  })

  it("applies a positional predicate", () => {
    expect(evaluateXPath(root(), "//li[2]")).toEqual(["second"])
  })

  it("applies an attribute-equals predicate", () => {
    expect(evaluateXPath(root(), '//div[@class="price"]')).toEqual(["$19.99"])
  })

  it("applies a contains() predicate on an attribute", () => {
    expect(evaluateXPath(root(), "//a[contains(@href,'/product/')]")).toEqual(["One", "Two"])
  })

  it("reads an attribute value via a trailing @attr step", () => {
    expect(evaluateXPath(root(), "//img/@alt")).toEqual(["hero image"])
  })

  it("reads text() explicitly", () => {
    expect(evaluateXPath(root(), "//div[1]/text()")).toEqual(["$19.99"])
  })

  it("matches a wildcard step", () => {
    expect(evaluateXPath(root(), "//ul/*")).toEqual(["first", "second", "third"])
  })

  it("returns an empty list when nothing matches", () => {
    expect(evaluateXPath(root(), "//section")).toEqual([])
  })

  it("returns an empty list for an empty expression", () => {
    expect(evaluateXPath(root(), "")).toEqual([])
  })

  it("supports an attribute existence predicate", () => {
    expect(evaluateXPath(root(), "//div[@class]")).toEqual(["$19.99", "$9.99"])
  })
})
