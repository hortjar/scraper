import type { RootConfig } from "@scraper/core/config"
import { LOG_FIELD, QUEUE, SPAN } from "@scraper/core/constants"
import type { ConnectionOptions, Worker } from "bullmq"
import { Effect } from "effect"

import type { WorkerRuntime } from "../runtime.js"
import { NotifyJobPayload } from "../schemas.js"

import { createQueueWorker } from "./worker-factory.js"

export const createNotifyWorker = (
  runtime: WorkerRuntime,
  connection: ConnectionOptions,
  redisConfig: RootConfig["redis"],
): Worker =>
  createQueueWorker({
    queue: QUEUE.notify,
    schema: NotifyJobPayload,
    connection,
    concurrency: redisConfig.notifyConcurrency,
    runtime,
    span: SPAN.jobs.notify,
    annotate: (payload) => ({ [LOG_FIELD.deliveryId]: payload.deliveryId }),
    handle: () => Effect.logInfo("job.notify.placeholder"),
  })
