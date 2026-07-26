import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

import { readPackageVersion } from "./package-version.js"

const writeFixture = (contents: string): URL => {
  const directory = mkdtempSync(path.join(tmpdir(), "scraper-pkg-"))
  const file = path.join(directory, "package.json")
  writeFileSync(file, contents, "utf8")
  return pathToFileURL(file)
}

describe("readPackageVersion", () => {
  it("reads the version field", () => {
    expect(readPackageVersion(writeFixture('{"version":"1.2.3"}'))).toBe("1.2.3")
  })

  it("returns undefined when the file is missing, so the config default applies", () => {
    expect(readPackageVersion(pathToFileURL("/nonexistent/package.json"))).toBeUndefined()
  })

  it("returns undefined for malformed json rather than throwing at startup", () => {
    expect(readPackageVersion(writeFixture("{not json"))).toBeUndefined()
  })

  it("returns undefined when version is absent, blank or not a string", () => {
    expect(readPackageVersion(writeFixture('{"name":"x"}'))).toBeUndefined()
    expect(readPackageVersion(writeFixture('{"version":"   "}'))).toBeUndefined()
    expect(readPackageVersion(writeFixture('{"version":42}'))).toBeUndefined()
  })
})
