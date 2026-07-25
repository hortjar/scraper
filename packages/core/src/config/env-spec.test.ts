import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { ENV_SPEC } from "./env-spec.js"

const schemaSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "schema.ts"),
  "utf8",
)

const referencedNames = new Set(
  [...schemaSource.matchAll(/"([A-Z][A-Z0-9_]{2,})"/g)].map((match) => match[1]!),
)

describe("env spec", () => {
  it("declares every variable the config schema reads", () => {
    const undeclared = [...referencedNames].filter(
      (name) => !ENV_SPEC.some((entry) => entry.name === name),
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
      (entry) => !entry.required && !entry.secret && entry.defaultValue === null,
    ).map((entry) => entry.name)
    expect(missing).toEqual([])
  })

  it("never ships a default value for a secret", () => {
    const leaked = ENV_SPEC.filter((entry) => entry.secret && Boolean(entry.defaultValue)).map(
      (entry) => entry.name,
    )
    expect(leaked).toEqual([])
  })

  it("uses unique names", () => {
    const names = ENV_SPEC.map((entry) => entry.name)
    expect(names.length).toBe(new Set(names).size)
  })
})
