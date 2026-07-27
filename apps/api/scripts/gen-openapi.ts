import { writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { AppConfig, readPackageVersion } from "@scraper/core/config"
import { ROUTE } from "@scraper/core/constants"
import { Effect } from "effect"

import { createApiRoutes } from "../src/app.js"
import { makeRedisProbe } from "../src/health/redis-probe.js"
import { makeRuntime } from "../src/runtime.js"

const PACKAGE_VERSION =
  readPackageVersion(new URL("../package.json", import.meta.url)) ?? "0.0.0-dev"

const PLACEHOLDERS: readonly (readonly [string, string])[] = [
  ["APP_VERSION", PACKAGE_VERSION],
  ["APP_URL", "http://localhost:9300"],
  ["DATABASE_URL", "postgres://openapi:openapi@localhost:9302/openapi"],
  ["REDIS_URL", "redis://localhost:9303/0"],
  ["ENCRYPTION_KEY", "openapi-placeholder-key-000000000"],
  ["SESSION_SECRET", "openapi-placeholder-secret-000000"],
  ["POSTGRES_PASSWORD", "openapi-placeholder-password"],
]

for (const [name, value] of PLACEHOLDERS) {
  process.env[name] ??= value
}

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => sortKeysDeep(item))
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).toSorted(([a], [b]) =>
      a.localeCompare(b),
    )
    return Object.fromEntries(entries.map(([key, entryValue]) => [key, sortKeysDeep(entryValue)]))
  }
  return value
}

const runtime = makeRuntime()

const config = await runtime.runPromise(AppConfig)

const redisProbe = makeRedisProbe(config.redis)

const app = createApiRoutes({ runtime, redisProbe, config })

const response = await app.handle(new Request(`http://localhost${ROUTE.docs}/json`))

if (!response.ok) {
  await runtime.dispose()
  throw new Error(
    `openapi document request failed: ${String(response.status)} ${response.statusText}`,
  )
}

const spec: unknown = await response.json()

const outputPath = path.join(process.cwd(), "openapi.json")

await writeFile(outputPath, `${JSON.stringify(sortKeysDeep(spec), null, 2)}\n`, "utf8")

await runtime.runPromise(
  Effect.logInfo("openapi.written").pipe(Effect.annotateLogs({ path: outputPath })),
)

await runtime.dispose()
process.exit(0)
