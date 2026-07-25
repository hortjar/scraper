import { LOG_FIELD } from "@scraper/core/constants"
import { type ConnectionOptions, type Job, UnrecoverableError, Worker } from "bullmq"
import { Effect, Either, ParseResult, Schema } from "effect"

import type { WorkerRuntime } from "../runtime.js"

export interface QueueWorkerOptions<A, I> {
  readonly queue: string
  readonly schema: Schema.Schema<A, I, never>
  readonly connection: ConnectionOptions
  readonly concurrency: number
  readonly runtime: WorkerRuntime
  readonly span: string
  readonly annotate: (payload: A) => Readonly<Record<string, string>>
  readonly handle: (payload: A) => Effect.Effect<void, never, never>
}

export const createQueueWorker = <A, I>(options: QueueWorkerOptions<A, I>): Worker<I, void> =>
  new Worker<I, void>(
    options.queue,
    async (job: Job<I, void>) => {
      const decoded = Schema.decodeUnknownEither(options.schema)(job.data)
      if (Either.isLeft(decoded)) {
        throw new UnrecoverableError(ParseResult.TreeFormatter.formatErrorSync(decoded.left))
      }

      const payload = decoded.right
      await options.runtime.runPromise(
        options.handle(payload).pipe(
          Effect.annotateLogs({
            [LOG_FIELD.jobId]: job.id ?? "",
            [LOG_FIELD.queue]: options.queue,
            ...options.annotate(payload),
          }),
          Effect.withSpan(options.span),
        ),
      )
    },
    { connection: options.connection, concurrency: options.concurrency },
  )
