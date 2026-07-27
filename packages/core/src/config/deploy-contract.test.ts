import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { ConfigProvider, Effect } from "effect"
import { describe, expect, it } from "vitest"

import { rootConfig } from "./schema.js"

const COMPOSE_PATH = "../../../../deploy/docker-compose.yml"
const ANCHOR_START = "x-app-environment:"
const SERVICES_START = "\nservices:"
const ANCHOR_ENTRY = /^\s+- ([A-Z0-9_]+)/gmu

const MINIMAL_ENVIRONMENT: Readonly<Record<string, string>> = {
  APP_URL: "https://scraper.example.com",
  ENCRYPTION_KEY: "encryption-key",
  POSTGRES_PASSWORD: "postgres-password",
  SESSION_SECRET: "session-secret",
}

const anchorNames = (): readonly string[] => {
  const compose = readFileSync(fileURLToPath(new URL(COMPOSE_PATH, import.meta.url)), "utf8")
  const anchor = compose.slice(compose.indexOf(ANCHOR_START), compose.indexOf(SERVICES_START))
  return Array.from(anchor.matchAll(ANCHOR_ENTRY), ([, name]) => name ?? "")
}

const loadRootConfig = (environment: Readonly<Record<string, string>>) => {
  const provider = ConfigProvider.fromMap(new Map(Object.entries(environment)))
  return Effect.runPromise(rootConfig.pipe(Effect.withConfigProvider(provider)))
}

describe("the deploy contract", () => {
  it("boots on the four names an operator is asked to set, so every other key has a default", async () => {
    await expect(loadRootConfig(MINIMAL_ENVIRONMENT)).resolves.toBeDefined()
  })

  it("passes every name it needs through compose, which forwards only what the anchor lists", () => {
    const forwarded = anchorNames()

    for (const name of Object.keys(MINIMAL_ENVIRONMENT)) {
      expect(forwarded).toContain(name)
    }
  })
})
