import { describe, expect, it } from "vitest"

import { MAX_HUNK_CHARACTERS } from "../runs.constants.js"

import { diffText, withContext } from "./text-diff.js"

const kinds = (hunks: readonly { kind: string }[]): readonly string[] => hunks.map((h) => h.kind)

describe("diffText", () => {
  it("returns nothing when the two sides are identical", () => {
    expect(diffText("the price is 10", "the price is 10")).toEqual([])
  })

  it("marks the replaced words and keeps the surrounding text", () => {
    const hunks = diffText("the price is 10", "the price is 12")

    expect(kinds(hunks)).toContain("added")
    expect(kinds(hunks)).toContain("removed")
    expect(hunks.some((hunk) => hunk.value.includes("12"))).toBe(true)
    expect(hunks.some((hunk) => hunk.value.includes("10"))).toBe(true)
  })

  it("reports a pure addition without a removal", () => {
    expect(kinds(diffText("alpha", "alpha beta"))).not.toContain("removed")
  })
})

describe("withContext", () => {
  const longUnchanged = Array.from({ length: 40 }, (_, index) => `line ${String(index)}`).join("\n")

  it("drops unchanged text entirely when nothing changed", () => {
    expect(withContext([{ value: longUnchanged }])).toEqual([])
  })

  it("keeps only the trailing context before a change", () => {
    const hunks = withContext([{ value: longUnchanged }, { added: true, value: "new" }])
    const context = hunks[0]

    expect(context?.kind).toBe("unchanged")
    expect(context?.value.split("\n")).toHaveLength(2)
    expect(context?.value).toContain("line 39")
    expect(context?.value).not.toContain("line 0")
  })

  it("keeps only the leading context after a change", () => {
    const hunks = withContext([{ added: true, value: "new" }, { value: longUnchanged }])
    const context = hunks[1]

    expect(context?.value.split("\n")).toHaveLength(2)
    expect(context?.value).toContain("line 0")
    expect(context?.value).not.toContain("line 39")
  })

  it("keeps both edges of unchanged text sitting between two changes", () => {
    const hunks = withContext([
      { removed: true, value: "old" },
      { value: longUnchanged },
      { added: true, value: "new" },
    ])
    const context = hunks[1]

    expect(context?.value).toContain("line 0")
    expect(context?.value).toContain("line 39")
    expect(context?.value).not.toContain("line 20")
  })

  it("keeps short unchanged text between changes whole", () => {
    const hunks = withContext([
      { removed: true, value: "old" },
      { value: "a\nb" },
      { added: true, value: "new" },
    ])

    expect(hunks[1]?.value).toBe("a\nb")
  })

  it("truncates a hunk that would otherwise bloat the stored diff", () => {
    const huge = "x".repeat(MAX_HUNK_CHARACTERS * 2)
    const hunks = withContext([{ added: true, value: huge }])

    expect(hunks[0]?.value).toHaveLength(MAX_HUNK_CHARACTERS)
  })
})
