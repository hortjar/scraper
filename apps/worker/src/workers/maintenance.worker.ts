import { QUEUE, SPAN } from "@scraper/core/constants"
import { MaintenanceJobPayload, runMaintenanceTask } from "@scraper/server/modules/jobs"
import type { ConnectionOptions, Worker } from "bullmq"

import type { WorkerRuntime } from "../runtime.js"

import { QUEUE_CONCURRENCY_DEFAULT } from "./queue-defaults.constants.js"
import { createQueueWorker } from "./worker-factory.js"

export const createMaintenanceWorker = (
  runtime: WorkerRuntime,
  connection: ConnectionOptions,
  prefix: string,
): Worker =>
  createQueueWorker({
    queue: QUEUE.maintenance,
    schema: MaintenanceJobPayload,
    connection,
    prefix,
    concurrency: QUEUE_CONCURRENCY_DEFAULT.maintenance,
    runtime,
    span: SPAN.jobs.maintenance,
    annotate: (payload) => ({ task: payload.task }),
    handle: (payload) => runMaintenanceTask(payload),
  })
