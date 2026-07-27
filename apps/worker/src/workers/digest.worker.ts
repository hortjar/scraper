import { LOG_FIELD, QUEUE, SPAN } from "@scraper/core/constants"
import { DigestJobPayload, flushDigest } from "@scraper/server/modules/jobs"
import type { ConnectionOptions, Worker } from "bullmq"

import type { WorkerRuntime } from "../runtime.js"

import { QUEUE_CONCURRENCY_DEFAULT } from "./queue-defaults.constants.js"
import { createQueueWorker } from "./worker-factory.js"

export const createDigestWorker = (
  runtime: WorkerRuntime,
  connection: ConnectionOptions,
  prefix: string,
): Worker =>
  createQueueWorker({
    queue: QUEUE.digest,
    schema: DigestJobPayload,
    connection,
    prefix,
    concurrency: QUEUE_CONCURRENCY_DEFAULT.digest,
    runtime,
    span: SPAN.jobs.digest,
    annotate: (payload) => ({ [LOG_FIELD.ruleId]: payload.ruleId }),
    handle: (payload) => flushDigest(payload),
  })
