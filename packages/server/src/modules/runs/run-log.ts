import { LOG_EVENT, LOG_FIELD } from "@scraper/core/constants"
import type { MonitorId, RunId, RunStatus, RunTrigger } from "@scraper/core/domain"
import { Effect } from "effect"

export interface RunLogIdentity {
  readonly monitorId: MonitorId
  readonly runId: RunId
}

const identity = (run: RunLogIdentity) => ({
  [LOG_FIELD.monitorId]: run.monitorId,
  [LOG_FIELD.runId]: run.runId,
})

export const logRunStarted = (
  run: RunLogIdentity,
  detail: {
    readonly trigger: RunTrigger
    readonly attempt: number
    readonly url: string
    readonly isResumed: boolean
  },
) =>
  Effect.logInfo(detail.isResumed ? LOG_EVENT.run.resumed : LOG_EVENT.run.started).pipe(
    Effect.annotateLogs({
      ...identity(run),
      [LOG_FIELD.trigger]: detail.trigger,
      [LOG_FIELD.attempt]: detail.attempt,
      [LOG_FIELD.url]: detail.url,
    }),
  )

export const logRunSkipped = (run: RunLogIdentity, reason: string) =>
  Effect.logInfo(LOG_EVENT.run.skipped).pipe(
    Effect.annotateLogs({ ...identity(run), [LOG_FIELD.reason]: reason }),
  )

export const logRunUnchanged = (run: RunLogIdentity, contentHash: string) =>
  Effect.logInfo(LOG_EVENT.run.unchanged).pipe(
    Effect.annotateLogs({ ...identity(run), [LOG_FIELD.contentHash]: contentHash }),
  )

export const logRunDiffed = (run: RunLogIdentity, changeCount: number) =>
  Effect.logInfo(LOG_EVENT.run.diffed).pipe(
    Effect.annotateLogs({ ...identity(run), [LOG_FIELD.changeCount]: changeCount }),
  )

export const logRunFinished = (
  run: RunLogIdentity,
  detail: {
    readonly status: RunStatus
    readonly durationMs: number
    readonly isChanged: boolean
    readonly strategy: string
    readonly httpStatus: number
    readonly bytes: number
  },
) =>
  Effect.logInfo(LOG_EVENT.run.finished).pipe(
    Effect.annotateLogs({
      ...identity(run),
      [LOG_FIELD.status]: detail.status,
      [LOG_FIELD.durationMs]: detail.durationMs,
      [LOG_FIELD.changed]: detail.isChanged,
      [LOG_FIELD.strategy]: detail.strategy,
      [LOG_FIELD.httpStatus]: detail.httpStatus,
      [LOG_FIELD.bytes]: detail.bytes,
    }),
  )

export const logRunFailed = (
  run: RunLogIdentity,
  detail: {
    readonly errorTag: string
    readonly reason: string | null
    readonly cause: string
    readonly durationMs: number
  },
) =>
  Effect.logError(LOG_EVENT.run.failed).pipe(
    Effect.annotateLogs({
      ...identity(run),
      [LOG_FIELD.errorTag]: detail.errorTag,
      ...(detail.reason !== null && { [LOG_FIELD.reason]: detail.reason }),
      [LOG_FIELD.cause]: detail.cause,
      [LOG_FIELD.durationMs]: detail.durationMs,
    }),
  )
