import { writeFile } from "node:fs/promises"
import path from "node:path"

import { AppConfig } from "@scraper/core/config"
import { ROUTE } from "@scraper/core/constants"


import { createApp } from "../src/app.js"
import { makeRedisProbe } from "../src/health/redis-probe.js"
import { makeRuntime } from "../src/runtime.js"

const PLACEHOLDERS: readonly (readonly [string, string])[] = [
  ["APP_URL", "http://localhost:3001"],
  ["DATABASE_URL", "postgres://openapi:openapi@localhost:5432/openapi"],
  ["REDIS_URL", "redis://localhost:6379/0"],
  ["ENCRYPTION_KEY", "openapi-placeholder-key-000000000"],
  ["SESSION_SECRET", "openapi-placeholder-secret-000000"],
  ["MAIL_FROM", "openapi@example.com"],
]

for (const [name, value] of PLACEHOLDERS) {
  process.env[name] ??= value
}

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    )
    return Object.fromEntries(entries.map(([key, entryValue]) => [key, sortKeysDeep(entryValue)]))
  }
  return value
}

const runtime = makeRuntime()

const config = await runtime.runPromise(AppConfig)

const redisProbe = makeRedisProbe(config.redis)

const app = createApp({ runtime, redisProbe, corsOrigins: config.http.corsOrigins })

const response = await app.handle(new Request(`http://localhost${ROUTE.docs}/json`))

if (!response.ok) {
  console.error(`Failed to generate OpenAPI document: ${response.status} ${response.statusText}`)
  await runtime.dispose()
  process.exit(1)
}

const spec: unknown = await response.json()

const outputPath = path.join(process.cwd(), "openapi.json")

await writeFile(outputPath, `${JSON.stringify(sortKeysDeep(spec), null, 2)}\n`, "utf8")

console.log(`Wrote ${outputPath}`)

await runtime.dispose()
process.exit(0)
