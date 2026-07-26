import process from "node:process"

import { AppConfig, seedAppVersion } from "@scraper/core/config"
import { LOG_FIELD, TIMEOUT } from "@scraper/core/constants"
import { runMigrations } from "@scraper/db/migrator"
import { Cause, Effect, Exit } from "effect"

import { createApp } from "./app.js"
import { makeRedisProbe } from "./health/redis-probe.js"
import { makeRuntime } from "./runtime.js"

seedAppVersion(new URL("../package.json", import.meta.url))

const runtime = makeRuntime()

const config = await runtime.runPromise(AppConfig)

const migrationEffect = config.database.runMigrationsOnBoot
  ? Effect.logInfo("db.migrate.start").pipe(
      Effect.zipRight(runMigrations()),
      Effect.tap((result) =>
        Effect.logInfo("db.migrate.finish").pipe(
          Effect.annotateLogs({ [LOG_FIELD.migrationsApplied]: result.applied.length }),
        ),
      ),
    )
  : Effect.logInfo("db.migrate.skip")

const migrationFailureEffect = (cause: Cause.Cause<unknown>) =>
  Effect.logError("db.migrate.failed").pipe(Effect.annotateLogs({ cause: Cause.pretty(cause) }))

const migrationExit = await runtime.runPromiseExit(migrationEffect)

if (Exit.isFailure(migrationExit)) {
  await runtime.runPromise(migrationFailureEffect(migrationExit.cause))
  await runtime.dispose()
  process.exit(1)
}

const redisProbe = makeRedisProbe(config.redis)

const app = createApp({
  runtime,
  redisProbe,
  corsOrigins: config.http.corsOrigins,
})

app.listen({ hostname: config.http.host, port: config.http.port }, () => {
  runtime.runFork(
    Effect.logInfo("api.listening").pipe(
      Effect.annotateLogs({ host: config.http.host, port: config.http.port }),
    ),
  )
})

const shutdownEffect = Effect.gen(function* () {
  yield* Effect.logInfo("api.shutdown.start")
  yield* Effect.tryPromise(() => app.stop()).pipe(
    Effect.timeout(TIMEOUT.shutdownGraceMs),
    Effect.ignore,
  )
  yield* Effect.logInfo("api.shutdown.drained")
})

const shutdownState = { hasStarted: false }

const shutdown = async () => {
  if (shutdownState.hasStarted) return
  shutdownState.hasStarted = true
  await runtime.runPromise(shutdownEffect)
  await runtime.dispose()
  process.exit(0)
}

process.on("SIGTERM", () => {
  void shutdown()
})
process.on("SIGINT", () => {
  void shutdown()
})
