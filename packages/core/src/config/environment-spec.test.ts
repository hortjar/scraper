import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { ENV_SPEC } from "./environment-spec.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaSource = readFileSync(path.resolve(here, "schema.ts"), "utf8")

const referencedNames = new Set(
  Array.from(schemaSource.matchAll(/"([A-Z][A-Z0-9_]{2,})"/g), (match) => match[1]).filter(
    (name) => name !== undefined,
  ),
)

describe("environment spec", () => {
  it("declares every variable the config schema reads", () => {
    const undeclared = [...referencedNames].filter((name) =>
      ENV_SPEC.every((entry) => entry.name !== name),
    )
    expect(undeclared).toEqual([])
  })

  it("has no declared variable the config schema ignores", () => {
    const unused = ENV_SPEC.filter((entry) => !referencedNames.has(entry.name)).map(
      (entry) => entry.name,
    )
    expect(unused).toEqual([])
  })

  it("gives every non-secret optional variable a default", () => {
    const missing = ENV_SPEC.filter(
      (entry) => !entry.isRequired && !entry.isSecret && entry.defaultValue === null,
    ).map((entry) => entry.name)
    expect(missing).toEqual([])
  })

  it("never ships a default value for a secret", () => {
    const leaked = ENV_SPEC.filter((entry) => entry.isSecret && Boolean(entry.defaultValue)).map(
      (entry) => entry.name,
    )
    expect(leaked).toEqual([])
  })

  it("uses unique names", () => {
    const names = ENV_SPEC.map((entry) => entry.name)
    expect(names.length).toBe(new Set(names).size)
  })
})
