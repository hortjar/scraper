import type { RootConfig } from "@scraper/core/config"
import { LOG_FIELD, QUEUE, SPAN } from "@scraper/core/constants"
import { ScrapeJobPayload, ScrapeRunner } from "@scraper/server/modules/jobs"
import type { ConnectionOptions, Worker } from "bullmq"
import { Effect } from "effect"

import type { WorkerRuntime } from "../runtime.js"

import { createQueueWorker } from "./worker-factory.js"

export const createScrapeWorker = (
  runtime: WorkerRuntime,
  connection: ConnectionOptions,
  redisConfig: RootConfig["redis"],
): Worker =>
  createQueueWorker({
    queue: QUEUE.scrape,
    schema: ScrapeJobPayload,
    connection,
    concurrency: redisConfig.workerConcurrency,
    runtime,
    span: SPAN.jobs.scrape,
    annotate: (payload) => ({ [LOG_FIELD.monitorId]: payload.monitorId }),
    handle: (payload) => Effect.flatMap(ScrapeRunner, (runner) => runner.execute(payload)),
  })
