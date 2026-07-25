import { LOG_FIELD, QUEUE, SPAN } from "@scraper/core/constants"
import type { ConnectionOptions, Worker } from "bullmq"
import { Effect } from "effect"

import type { WorkerRuntime } from "../runtime.js"
import { DigestJobPayload } from "../schemas.js"

import { QUEUE_CONCURRENCY_DEFAULT } from "./queue-defaults.constants.js"
import { createQueueWorker } from "./worker-factory.js"

export const createDigestWorker = (runtime: WorkerRuntime, connection: ConnectionOptions): Worker =>
  createQueueWorker({
    queue: QUEUE.digest,
    schema: DigestJobPayload,
    connection,
    concurrency: QUEUE_CONCURRENCY_DEFAULT.digest,
    runtime,
    span: SPAN.jobs.digest,
    annotate: (payload) => ({ [LOG_FIELD.ruleId]: payload.ruleId }),
    handle: () => Effect.logInfo("job.digest.placeholder"),
  })
