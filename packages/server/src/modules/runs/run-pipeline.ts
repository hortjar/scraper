import { AppConfig } from "@scraper/core/config"
import { RUN_STATUS, SPAN } from "@scraper/core/constants"
import type {
  ExtractedField,
  Extractor,
  Monitor,
  MonitorId,
  Run,
  RunId,
  RunTrigger,
} from "@scraper/core/domain"
import type { AppError } from "@scraper/core/errors"
import { Clock, Effect } from "effect"

import { RateLimiter } from "../jobs/index.js"
import { MonitorRepository } from "../monitors/index.js"
import { scrapeAndExtract } from "../scraping/index.js"

import { diffWholePage } from "./diff/field-diff.js"
import { nextMonitorState } from "./monitor-state.js"
import { evaluateRules } from "./rules/rule-evaluation.js"
import { claimExistingRun } from "./run-claim.js"
import {
  logRunDiffed,
  logRunFailed,
  logRunFinished,
  logRunSkipped,
  logRunStarted,
  logRunUnchanged,
} from "./run-log.js"
import {
  detailOf,
  draftFieldChanges,
  isOperatorFault,
  previousByKey,
  reasonOf,
  toFieldValueInput,
  toMonitorConfig,
} from "./run-pipeline.mappers.js"
import { storeScreenshot } from "./run-screenshot.js"
import { MONITOR_ARCHIVED_REASON, MONITOR_DISABLED_REASON } from "./runs.constants.js"
import { RunRepository } from "./runs.repository.js"

export interface RunRequest {
  readonly monitorId: MonitorId
  readonly trigger: RunTrigger
  readonly attempt: number
  readonly jobId: string | null
  readonly runId?: RunId | undefined
}

const hostOf = (url: string): string => new URL(url).hostname

const recordMonitorState = (
  monitorId: MonitorId,
  monitor: Monitor,
  isFailed: boolean,
  isOperatorFault: boolean,
  autoPauseAfterFailures: number,
  finishedAt: Date,
  changedAt: Date | null,
) =>
  Effect.gen(function* () {
    const monitors = yield* MonitorRepository
    const state = nextMonitorState({
      consecutiveFailures: monitor.consecutiveFailures,
      failed: isFailed,
      operatorFault: isOperatorFault,
      autoPauseAfterFailures,
    })
    yield* monitors.recordRunOutcome(monitorId, {
      status: state.status,
      consecutiveFailures: state.consecutiveFailures,
      lastRunAt: finishedAt,
      ...(state.enabled !== null && { enabled: state.enabled }),
      ...(changedAt !== null && { lastChangeAt: changedAt }),
    })
  })

interface ExecuteInput {
  readonly runId: RunId
  readonly monitor: Monitor
  readonly extractors: readonly Extractor[]
  readonly previousRun: Run | null
  readonly startedAtMs: number
  readonly autoPauseAfterFailures: number
}

const execute = Effect.fn(SPAN.runs.persist)(function* (input: ExecuteInput) {
  const runs = yield* RunRepository
  const outcome = yield* scrapeAndExtract(toMonitorConfig(input.monitor, input.extractors))
  const finishedAtMs = yield* Clock.currentTimeMillis
  const finishedAt = new Date(finishedAtMs)
  const durationMs = finishedAtMs - input.startedAtMs

  const isUnchanged =
    input.previousRun !== null && input.previousRun.contentHash === outcome.contentHash

  yield* runs.insertFieldValues(
    input.runId,
    input.monitor.id,
    outcome.fields.map((field) => toFieldValueInput(field)),
  )

  const screenshotReference = yield* storeScreenshot(
    input.monitor.id,
    input.runId,
    outcome.response.screenshot,
  )
  yield* runs.insertSnapshot(input.runId, input.monitor.id, outcome.normalized, screenshotReference)

  const logIdentity = { monitorId: input.monitor.id, runId: input.runId }

  if (isUnchanged) {
    yield* runs.finish(input.runId, {
      status: RUN_STATUS.success,
      finishedAt,
      durationMs,
      changed: false,
      strategyUsed: outcome.strategyUsed,
      httpStatus: outcome.response.httpStatus,
      bytes: outcome.response.html.length,
      contentHash: outcome.contentHash,
    })
    yield* logRunUnchanged(logIdentity, outcome.contentHash)
    yield* logRunFinished(logIdentity, {
      status: RUN_STATUS.success,
      durationMs,
      isChanged: false,
      strategy: outcome.strategyUsed,
      httpStatus: outcome.response.httpStatus,
      bytes: outcome.response.html.length,
    })
    yield* recordMonitorState(
      input.monitor.id,
      input.monitor,
      false,
      false,
      input.autoPauseAfterFailures,
      finishedAt,
      null,
    )
    return
  }

  const drafts = yield* diffAgainstPrevious(input, outcome.normalized, outcome.fields)
  const changes = yield* runs.insertChanges(
    input.runId,
    input.monitor.id,
    input.previousRun?.id ?? null,
    drafts,
  )

  yield* runs.finish(input.runId, {
    status: RUN_STATUS.success,
    finishedAt,
    durationMs,
    changed: drafts.length > 0,
    strategyUsed: outcome.strategyUsed,
    httpStatus: outcome.response.httpStatus,
    bytes: outcome.response.html.length,
    contentHash: outcome.contentHash,
  })

  yield* logRunDiffed(logIdentity, drafts.length)
  yield* logRunFinished(logIdentity, {
    status: RUN_STATUS.success,
    durationMs,
    isChanged: drafts.length > 0,
    strategy: outcome.strategyUsed,
    httpStatus: outcome.response.httpStatus,
    bytes: outcome.response.html.length,
  })

  yield* recordMonitorState(
    input.monitor.id,
    input.monitor,
    false,
    false,
    input.autoPauseAfterFailures,
    finishedAt,
    drafts.length > 0 ? finishedAt : null,
  )

  yield* evaluateRules({
    monitorId: input.monitor.id,
    runId: input.runId,
    changes,
    drafts,
    runFailed: false,
    previousRunFailed: input.previousRun === null,
    lastChangeAt: input.monitor.lastChangeAt,
    now: finishedAt,
  })
})

const diffAgainstPrevious = Effect.fn(SPAN.runs.diff)(function* (
  input: ExecuteInput,
  normalized: string,
  fields: readonly ExtractedField[],
) {
  const runs = yield* RunRepository
  if (input.previousRun === null) return []

  if (input.extractors.length === 0) {
    const previousContent = yield* runs.latestSnapshot(input.previousRun.id)
    return previousContent === null ? [] : diffWholePage(previousContent, normalized)
  }

  const stored = yield* runs.fieldValues(input.previousRun.id)
  return draftFieldChanges(input.extractors, previousByKey(stored), fields)
})

interface FailureInput {
  readonly runId: RunId
  readonly monitor: Monitor
  readonly autoPauseAfterFailures: number
  readonly startedAtMs: number
  readonly error: AppError
}

const failRun = Effect.fn(SPAN.runs.persist)(function* (input: FailureInput) {
  const runs = yield* RunRepository
  const finishedAtMs = yield* Clock.currentTimeMillis
  const finishedAt = new Date(finishedAtMs)

  yield* runs.finish(input.runId, {
    status: RUN_STATUS.failed,
    finishedAt,
    durationMs: finishedAtMs - input.startedAtMs,
    changed: false,
    errorKind: input.error._tag,
    errorMessage: detailOf(input.error),
  })

  yield* logRunFailed(
    { monitorId: input.monitor.id, runId: input.runId },
    {
      errorTag: input.error._tag,
      reason: reasonOf(input.error),
      cause: detailOf(input.error),
      durationMs: finishedAtMs - input.startedAtMs,
    },
  )

  yield* recordMonitorState(
    input.monitor.id,
    input.monitor,
    true,
    isOperatorFault(input.error),
    input.autoPauseAfterFailures,
    finishedAt,
    null,
  )

  yield* evaluateRules({
    monitorId: input.monitor.id,
    runId: input.runId,
    changes: [],
    drafts: [],
    runFailed: true,
    previousRunFailed: false,
    lastChangeAt: input.monitor.lastChangeAt,
    now: finishedAt,
  })
})

export const runPipeline = Effect.fn(SPAN.runs.execute)(function* (request: RunRequest) {
  const config = yield* AppConfig
  const monitors = yield* MonitorRepository
  const runs = yield* RunRepository
  const rateLimiter = yield* RateLimiter

  const resumed = yield* claimExistingRun(runs, request)
  if (resumed !== null && resumed.status !== RUN_STATUS.running) return resumed

  const monitor = yield* monitors.findAnyById(request.monitorId)
  const extractors = yield* monitors.listExtractors(request.monitorId)

  const startedAtMs = yield* Clock.currentTimeMillis
  const startedAt = new Date(startedAtMs)

  if (!monitor.enabled || monitor.archivedAt !== null) {
    const skipped = resumed ?? (yield* runs.start({ ...request, startedAt }))
    yield* runs.finish(skipped.id, {
      status: RUN_STATUS.skipped,
      finishedAt: startedAt,
      durationMs: 0,
      changed: false,
    })
    yield* logRunSkipped(
      { monitorId: request.monitorId, runId: skipped.id },
      monitor.enabled ? MONITOR_ARCHIVED_REASON : MONITOR_DISABLED_REASON,
    )
    return skipped
  }

  yield* rateLimiter.checkDomain(hostOf(monitor.url))

  const run = resumed ?? (yield* runs.start({ ...request, startedAt }))

  yield* logRunStarted(
    { monitorId: request.monitorId, runId: run.id },
    {
      trigger: request.trigger,
      attempt: request.attempt,
      url: monitor.url,
      isResumed: resumed !== null,
    },
  )
  const previousRun = yield* runs.previousSuccessful(request.monitorId, startedAt)
  const autoPauseAfterFailures = config.scraping.autoPauseAfterFailures

  yield* execute({
    runId: run.id,
    monitor,
    extractors,
    previousRun,
    startedAtMs,
    autoPauseAfterFailures,
  }).pipe(
    Effect.catchAll((error: AppError) =>
      failRun({ runId: run.id, monitor, autoPauseAfterFailures, startedAtMs, error }).pipe(
        Effect.zipRight(Effect.fail(error)),
      ),
    ),
  )

  return yield* runs.findById(run.id).pipe(Effect.map((found) => found ?? run))
})
