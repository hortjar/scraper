import process from "node:process"

import { AppConfig } from "@scraper/core/config"
import { TIMEOUT } from "@scraper/core/constants"
import { Effect } from "effect"

import { createApp } from "./app.js"
import { makeRedisProbe } from "./health/redis-probe.js"
import { makeRuntime } from "./runtime.js"

const runtime = makeRuntime()

const config = await runtime.runPromise(AppConfig)

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
