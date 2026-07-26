import { describe, expect, it } from "vitest"

import { queryJsonPath, type JsonValue } from "./jsonpath.js"

describe("queryJsonPath", () => {
  const document: JsonValue = {
    product: {
      name: "Widget",
      price: 19.99,
      tags: ["new", "sale"],
      variants: [
        { sku: "A1", inStock: true },
        { sku: "A2", inStock: false },
      ],
    },
  }

  it("reads a nested key with dot notation", () => {
    expect(queryJsonPath(document, "$.product.name")).toEqual(["Widget"])
  })

  it("reads an array index", () => {
    expect(queryJsonPath(document, "$.product.tags[0]")).toEqual(["new"])
  })

  it("reads a bracketed key", () => {
    expect(queryJsonPath(document, "$['product']['price']")).toEqual([19.99])
  })

  it("fans out over a wildcard array", () => {
    expect(queryJsonPath(document, "$.product.variants[*].sku")).toEqual(["A1", "A2"])
  })

  it("fans out over a wildcard object", () => {
    expect(queryJsonPath({ a: 1, b: 2 }, "$[*]")).toEqual([1, 2])
  })

  it("returns nothing for a missing key", () => {
    expect(queryJsonPath(document, "$.product.missing")).toEqual([])
  })

  it("returns the root for an empty path", () => {
    expect(queryJsonPath(document, "$")).toEqual([document])
  })

  it("returns nothing when indexing past the end of an array", () => {
    expect(queryJsonPath(document, "$.product.tags[9]")).toEqual([])
  })

  it("returns nothing when a path segment hits a scalar", () => {
    expect(queryJsonPath(document, "$.product.name.nested")).toEqual([])
  })
})
