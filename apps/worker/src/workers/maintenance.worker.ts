import { QUEUE, SPAN } from "@scraper/core/constants"
import type { ConnectionOptions, Worker } from "bullmq"
import { Effect } from "effect"

import type { WorkerRuntime } from "../runtime.js"
import { MaintenanceJobPayload } from "../schemas.js"

import { QUEUE_CONCURRENCY_DEFAULT } from "./queue-defaults.constants.js"
import { createQueueWorker } from "./worker-factory.js"

export const createMaintenanceWorker = (
  runtime: WorkerRuntime,
  connection: ConnectionOptions,
): Worker =>
  createQueueWorker({
    queue: QUEUE.maintenance,
    schema: MaintenanceJobPayload,
    connection,
    concurrency: QUEUE_CONCURRENCY_DEFAULT.maintenance,
    runtime,
    span: SPAN.jobs.maintenance,
    annotate: (payload) => ({ task: payload.task }),
    handle: () => Effect.logInfo("job.maintenance.placeholder"),
  })
