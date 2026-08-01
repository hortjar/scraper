import { hostname } from "node:os"
import process from "node:process"

import { AppConfig, seedAppVersion } from "@scraper/core/config"
import { JobProducer } from "@scraper/server/modules/jobs"
import { Effect } from "effect"

import { makeConnection } from "./connection.js"
import { startHeartbeat, stopHeartbeat } from "./heartbeat.js"
import { makeRuntime } from "./runtime.js"
import { createDigestWorker } from "./workers/digest.worker.js"
import { createMaintenanceWorker } from "./workers/maintenance.worker.js"
import { createNotifyWorker } from "./workers/notify.worker.js"
import { createScrapeWorker } from "./workers/scrape.worker.js"

seedAppVersion(new URL("../package.json", import.meta.url))

const runtime = makeRuntime()

const config = await runtime.runPromise(AppConfig)

const connection = makeConnection(config.redis)

const workerId = hostname()

const workers = [
  createScrapeWorker(runtime, connection, config.redis),
  createNotifyWorker(runtime, connection, config.redis),
  createDigestWorker(runtime, connection, config.redis.jobPrefix),
  createMaintenanceWorker(runtime, connection, config.redis.jobPrefix),
] as const

const heartbeat = startHeartbeat(connection, workerId)

runtime.runFork(
  Effect.flatMap(JobProducer, (producer) => producer.ensureMaintenanceSchedules()).pipe(
    Effect.catchAll((error) =>
      Effect.logError("worker.maintenanceSchedules.failed").pipe(
        Effect.annotateLogs({ error: String(error) }),
      ),
    ),
  ),
)

runtime.runFork(
  Effect.logInfo("worker.listening").pipe(
    Effect.annotateLogs({
      workerId,
      queues: workers.length,
      version: config.app.version,
      commit: config.app.gitSha,
      builtAt: config.app.builtAt,
    }),
  ),
)

const shutdownState = { hasStarted: false }

const shutdown = async (): Promise<void> => {
  if (shutdownState.hasStarted) return
  shutdownState.hasStarted = true
  await runtime.runPromise(Effect.logInfo("worker.shutdown.start"))
  stopHeartbeat(heartbeat)
  await Promise.all(workers.map((worker) => worker.close()))
  connection.disconnect()
  await runtime.runPromise(Effect.logInfo("worker.shutdown.drained"))
  await runtime.dispose()
  process.exit(0)
}

process.on("SIGTERM", () => {
  void shutdown()
})
process.on("SIGINT", () => {
  void shutdown()
})
