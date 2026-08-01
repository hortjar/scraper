import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const exportTargets = (): readonly string[] => {
  const manifest = readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")
  const { exports: map } = JSON.parse(manifest) as { exports: Record<string, string> }
  return Object.values(map)
}

const trackedFiles = (): ReadonlySet<string> => {
  const output = execFileSync("git", ["ls-files"], { cwd: PACKAGE_ROOT, encoding: "utf8" })
  return new Set(output.split("\n").filter((line) => line !== ""))
}

describe("package exports", () => {
  it("every exported subpath is committed, not just present on this machine", () => {
    const tracked = trackedFiles()
    const missing = exportTargets()
      .map((target) => target.replace(/^\.\//u, ""))
      .filter((target) => !tracked.has(target))

    expect(missing).toEqual([])
  })
})
