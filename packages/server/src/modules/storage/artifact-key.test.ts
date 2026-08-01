import path from "node:path"

import { describe, expect, it } from "vitest"

import { isSafeKey, localPathFor, screenshotKey } from "./artifact-key.js"

const ROOT = "/data/snapshots"
const MONITOR_ID = "11111111-1111-1111-1111-111111111111"
const RUN_ID = "22222222-2222-2222-2222-222222222222"

describe("screenshotKey", () => {
  it("partitions by monitor so one monitor's screenshots can be swept independently", () => {
    expect(screenshotKey(MONITOR_ID, RUN_ID)).toBe(`screenshots/${MONITOR_ID}/${RUN_ID}.png`)
  })
})

describe("isSafeKey", () => {
  it("accepts a generated key", () => {
    expect(isSafeKey(screenshotKey(MONITOR_ID, RUN_ID))).toBe(true)
  })

  it.each([
    ["empty", ""],
    ["absolute", "/etc/passwd"],
    ["traversal", "screenshots/../../etc/passwd"],
    ["bare traversal", ".."],
    ["whitespace", "screenshots/a b.png"],
  ])("rejects a %s key", (_label, key) => {
    expect(isSafeKey(key)).toBe(false)
  })

  it("allows a dot inside a segment — only a whole '..' segment escapes", () => {
    expect(isSafeKey("screenshots/a..b/c.png")).toBe(true)
  })
})

describe("localPathFor", () => {
  it("resolves a safe key under the root", () => {
    expect(localPathFor(ROOT, `screenshots/${MONITOR_ID}/${RUN_ID}.png`)).toBe(
      path.join(ROOT, "screenshots", MONITOR_ID, `${RUN_ID}.png`),
    )
  })

  it("returns null for traversal rather than a path outside the root", () => {
    expect(localPathFor(ROOT, "../../etc/passwd")).toBeNull()
  })

  it("does not treat a sibling directory with the same prefix as inside the root", () => {
    expect(localPathFor("/data/snap", "../snapshots/x.png")).toBeNull()
  })
})
