import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

import { readPackageVersion, resolveAppVersion } from "./package-version.js"

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

const WHITESPACE_ONLY = " ".repeat(3)

describe("resolveAppVersion", () => {
  const fixture = writeFixture('{"version":"0.6.0"}')

  it("prefers an explicitly set override", () => {
    expect(resolveAppVersion(fixture, "9.9.9")).toBe("9.9.9")
  })

  it("trims the override", () => {
    expect(resolveAppVersion(fixture, "  9.9.9  ")).toBe("9.9.9")
  })

  it("falls back to package.json when the override is unset", () => {
    expect(resolveAppVersion(fixture, undefined)).toBe("0.6.0")
  })

  it("falls back when the override is empty, because compose interpolates unset vars to an empty string", () => {
    expect(resolveAppVersion(fixture, "")).toBe("0.6.0")
    expect(resolveAppVersion(fixture, WHITESPACE_ONLY)).toBe("0.6.0")
  })

  it("returns undefined when neither source yields a version, so the config default applies", () => {
    expect(resolveAppVersion(pathToFileURL("/nonexistent/package.json"), "")).toBeUndefined()
  })
})
