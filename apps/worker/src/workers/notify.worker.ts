import type { RootConfig } from "@scraper/core/config"
import { LOG_FIELD, QUEUE, SPAN } from "@scraper/core/constants"
import { NotifyJobPayload, NotifyRunner } from "@scraper/server/modules/jobs"
import type { ConnectionOptions, Worker } from "bullmq"
import { Effect } from "effect"

import type { WorkerRuntime } from "../runtime.js"

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
    prefix: redisConfig.jobPrefix,
    concurrency: redisConfig.notifyConcurrency,
    runtime,
    span: SPAN.jobs.notify,
    annotate: (payload) => ({ [LOG_FIELD.deliveryId]: payload.deliveryId }),
    handle: (payload) => Effect.flatMap(NotifyRunner, (runner) => runner.execute(payload)),
  })
