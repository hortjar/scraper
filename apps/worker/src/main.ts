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

const workerId = globalThis.crypto.randomUUID()

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

let shuttingDown = false

const shutdown = async (): Promise<void> => {
  if (shuttingDown) return
  shuttingDown = true
  await runtime.runPromise(Effect.logInfo("worker.shutdown.start"))
  stopHeartbeat(heartbeat)
  await Promise.all(workers.map((worker) => worker.close()))
  connection.disconnect()
  await runtime.runPromise(Effect.logInfo("worker.shutdown.drained"))
  await runtime.dispose()
  globalThis.process.exit(0)
}

globalThis.process.on("SIGTERM", () => {
  void shutdown()
})
globalThis.process.on("SIGINT", () => {
  void shutdown()
})
