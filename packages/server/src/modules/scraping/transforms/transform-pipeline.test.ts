import type { ExtractorKey, Transform } from "@scraper/core"
import { Effect, Exit } from "effect"
import { describe, expect, it } from "vitest"

import { runTransforms } from "./transform-pipeline.js"

const KEY = "price" as ExtractorKey

const run = (raw: string | null, steps: readonly Transform[]) =>
  Effect.runSyncExit(runTransforms(KEY, raw, steps))

describe("runTransforms", () => {
  it("applies steps in order", () => {
    const steps: readonly Transform[] = [
      { kind: "trim" },
      { kind: "regex_extract", pattern: String.raw`\$([\d.]+)` },
      { kind: "parse_number" },
    ]
    expect(run("  Only $1299.00!  ", steps)).toEqual(Exit.succeed("1299"))
  })

  it("passes an empty step list through unchanged", () => {
    expect(run("hello", [])).toEqual(Exit.succeed("hello"))
  })

  it("short circuits on the first failing step", () => {
    const steps: readonly Transform[] = [
      { kind: "trim" },
      { kind: "regex_extract", pattern: "zzz" },
      { kind: "uppercase" },
    ]
    const exit = run("hello", steps)
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
      expect(exit.cause.error.transform).toBe("regex_extract")
      expect(exit.cause.error.detail).toBe("no_match")
      expect(exit.cause.error.extractorKey).toBe(KEY)
    }
  })

  it("seeds from the default step when raw is null", () => {
    const steps: readonly Transform[] = [{ kind: "default", value: "N/A" }]
    expect(run(null, steps)).toEqual(Exit.succeed("N/A"))
  })

  it("still runs steps after seeding from the default value", () => {
    const steps: readonly Transform[] = [{ kind: "default", value: "n/a" }, { kind: "uppercase" }]
    expect(run(null, steps)).toEqual(Exit.succeed("N/A"))
  })

  it("fails when raw is null and there is no default step", () => {
    const exit = run(null, [{ kind: "trim" }])
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
      expect(exit.cause.error.detail).toBe("no_value_and_no_default")
    }
  })

  it("never throws on an arbitrary string, only fails typed", () => {
    const weird = "\u{0}\u{1F600}<>&\"'\\n\t"
    const steps: readonly Transform[] = [
      { kind: "trim" },
      { kind: "lowercase" },
      { kind: "collapse_whitespace" },
      { kind: "strip_html" },
    ]
    expect(() => run(weird, steps)).not.toThrow()
  })
})
