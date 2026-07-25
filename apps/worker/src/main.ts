import process from "node:process"

import { AppConfig } from "@scraper/core/config"
import { Effect } from "effect"

import { makeConnection } from "./connection.js"
import { startHeartbeat, stopHeartbeat } from "./heartbeat.js"
import { makeRuntime } from "./runtime.js"
import { createDigestWorker } from "./workers/digest.worker.js"
import { createMaintenanceWorker } from "./workers/maintenance.worker.js"
import { createNotifyWorker } from "./workers/notify.worker.js"
import { createScrapeWorker } from "./workers/scrape.worker.js"

const runtime = makeRuntime()

const config = await runtime.runPromise(AppConfig)

const connection = makeConnection(config.redis)

const workerId = crypto.randomUUID()

const workers = [
  createScrapeWorker(runtime, connection, config.redis),
  createNotifyWorker(runtime, connection, config.redis),
  createDigestWorker(runtime, connection),
  createMaintenanceWorker(runtime, connection),
] as const

const heartbeat = startHeartbeat(connection, workerId)

runtime.runFork(
  Effect.logInfo("worker.listening").pipe(
    Effect.annotateLogs({ workerId, queues: workers.length }),
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
