import { FIRST_ATTEMPT, LOG_EVENT, LOG_FIELD } from "@scraper/core/constants"
import type { RateLimited } from "@scraper/core/errors"
import { metrics } from "@scraper/core/observability"
import { describeFailure, isRetryableFailure, recordQueueFire } from "@scraper/server/modules/jobs"
import { type ConnectionOptions, DelayedError, type Job, UnrecoverableError, Worker } from "bullmq"
import { Cause, Clock, Effect, Either, Exit, Metric, Option, ParseResult, Schema } from "effect"

import type { WorkerRuntime, WorkerServices } from "../runtime.js"

export interface QueueWorkerOptions<A, I, E> {
  readonly queue: string
  readonly schema: Schema.Schema<A, I>
  readonly connection: ConnectionOptions
  readonly prefix: string
  readonly concurrency: number
  readonly runtime: WorkerRuntime
  readonly span: string
  readonly annotate: (payload: A) => Readonly<Record<string, string>>
  readonly handle: (payload: A, jobId: string | null) => Effect.Effect<void, E, WorkerServices>
}

const firstLine = (cause: Cause.Cause<unknown>): string => {
  const [line] = Cause.pretty(cause).split("\n", 1)
  return line ?? ""
}

const isRateLimited = (error: unknown): error is RateLimited =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { readonly _tag: unknown })._tag === "RateLimited"

export const createQueueWorker = <A, I, E>(options: QueueWorkerOptions<A, I, E>): Worker<I, void> =>
  new Worker<I, void>(
    options.queue,
    async (job: Job<I, void>, token?: string) => {
      const decoded = Schema.decodeUnknownEither(options.schema)(job.data)
      if (Either.isLeft(decoded)) {
        throw new UnrecoverableError(ParseResult.TreeFormatter.formatErrorSync(decoded.left))
      }

      const payload = decoded.right
      const annotations = {
        [LOG_FIELD.jobId]: job.id ?? "",
        [LOG_FIELD.queue]: options.queue,
        ...options.annotate(payload),
      }

      await options.runtime.runPromise(recordQueueFire(options.queue))

      const attempt = job.attemptsMade + FIRST_ATTEMPT
      const maxAttempts = job.opts.attempts ?? FIRST_ATTEMPT
      const lifecycle = {
        ...annotations,
        [LOG_FIELD.attempt]: String(attempt),
        [LOG_FIELD.maxAttempts]: String(maxAttempts),
      }

      const startedAtMs = await options.runtime.runPromise(Clock.currentTimeMillis)
      await options.runtime.runPromise(
        Effect.logInfo(LOG_EVENT.job.received).pipe(Effect.annotateLogs(lifecycle)),
      )

      const exit = await options.runtime.runPromiseExit(
        options
          .handle(payload, job.id ?? null)
          .pipe(Effect.annotateLogs(annotations), Effect.withSpan(options.span)),
      )

      const durationMs = await options.runtime.runPromise(
        Clock.currentTimeMillis.pipe(Effect.map((now) => now - startedAtMs)),
      )
      const timed = { ...lifecycle, [LOG_FIELD.durationMs]: String(durationMs) }

      if (Exit.isSuccess(exit)) {
        await options.runtime.runPromise(
          Effect.logInfo(LOG_EVENT.job.completed).pipe(Effect.annotateLogs(timed)),
        )
        return
      }

      const outcome = attempt >= maxAttempts ? LOG_EVENT.job.failed : LOG_EVENT.job.retrying
      const failureAnnotations = { ...timed, [LOG_FIELD.cause]: firstLine(exit.cause) }
      await options.runtime.runPromise(
        Effect.logWarning(outcome).pipe(Effect.annotateLogs(failureAnnotations)),
      )

      const failure = Cause.failureOption(exit.cause)
      if (Option.isNone(failure)) {
        throw Cause.squash(exit.cause)
      }

      if (isRateLimited(failure.value)) {
        const rateLimited = failure.value
        const delayUntil = await options.runtime.runPromise(
          Clock.currentTimeMillis.pipe(
            Effect.map((now) => now + rateLimited.retryAfterSeconds * 1000),
          ),
        )
        await job.moveToDelayed(delayUntil, token)
        await options.runtime.runPromise(
          Metric.increment(Metric.tagged(metrics.rateLimitDeferred, "host", rateLimited.bucket)),
        )
        throw new DelayedError()
      }

      if (!isRetryableFailure(failure.value)) {
        throw new UnrecoverableError(describeFailure(failure.value))
      }

      throw Cause.squash(exit.cause)
    },
    { connection: options.connection, concurrency: options.concurrency, prefix: options.prefix },
  )
