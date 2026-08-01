import { FIRST_ATTEMPT, ROUTE, RUN_TRIGGER, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { ExtractorKey, MonitorId, RunId, UserId } from "@scraper/core/domain"
import { RunNotFound, ScreenshotNotFound, ValidationFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { pageSize } from "@scraper/db"
import { Effect } from "effect"

import { JobProducer } from "../jobs/index.js"
import { MonitorRepository } from "../monitors/index.js"
import { ArtifactStore } from "../storage/index.js"

import { diffText } from "./diff/text-diff.js"
import { RUN_PATH, SERIES_BUCKET, SERIES_EXTRACTOR_FIELD } from "./runs.constants.js"
import type { SeriesBucket } from "./runs.constants.js"
import { RunRepository } from "./runs.repository.js"

const screenshotPath = (runId: RunId): string =>
  `${ROUTE.runs}/${runId}${RUN_PATH.screenshotSuffix}`

export interface SeriesQuery {
  readonly extractorKey?: string | undefined
  readonly from?: string | undefined
  readonly to?: string | undefined
  readonly bucket?: string | undefined
}

const BUCKETS: readonly string[] = Object.values(SERIES_BUCKET)

const toBucket = (raw: string | undefined): SeriesBucket =>
  raw !== undefined && BUCKETS.includes(raw) ? (raw as SeriesBucket) : SERIES_BUCKET.raw

const toDate = (raw: string | undefined): Date | null => {
  if (raw === undefined || raw === "") return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export interface PageQuery {
  readonly cursor?: string | undefined
  readonly limit?: string | undefined
}

const toLimit = (limit: string | undefined): number =>
  pageSize(limit === undefined ? undefined : Number(limit))

export class Runs extends Effect.Service<Runs>()(SERVICE_TAG.Runs, {
  effect: Effect.gen(function* () {
    const repository = yield* RunRepository
    const monitors = yield* MonitorRepository
    const jobs = yield* JobProducer
    const store = yield* ArtifactStore

    const list = Effect.fn(SPAN.runs.list)(function* (
      userId: UserId,
      monitorId: MonitorId,
      query: PageQuery,
    ) {
      yield* monitors.findById(userId, monitorId)
      return yield* repository.list(monitorId, {
        cursor: query.cursor,
        limit: toLimit(query.limit),
      })
    })

    const listChanges = Effect.fn(SPAN.runs.listChanges)(function* (
      userId: UserId,
      monitorId: MonitorId,
      query: PageQuery,
    ) {
      yield* monitors.findById(userId, monitorId)
      return yield* repository.listChanges(monitorId, {
        cursor: query.cursor,
        limit: toLimit(query.limit),
      })
    })

    const findById = Effect.fn(SPAN.runs.findById)(function* (userId: UserId, runId: RunId) {
      const run = yield* repository.findById(runId)
      if (run === null) return yield* new RunNotFound({ id: runId })
      yield* monitors.findById(userId, run.monitorId)
      const fields = yield* repository.fieldValues(runId)
      const reference = yield* repository.screenshotReference(runId)
      return { run, fields, screenshotUrl: reference === null ? null : screenshotPath(runId) }
    })

    const trigger = Effect.fn(SPAN.runs.trigger)(function* (userId: UserId, monitorId: MonitorId) {
      yield* monitors.findById(userId, monitorId)
      yield* jobs.enqueueScrape({
        monitorId,
        trigger: RUN_TRIGGER.manual,
        attempt: FIRST_ATTEMPT,
      })
    })

    const snapshot = Effect.fn(SPAN.runs.findById)(function* (userId: UserId, runId: RunId) {
      const run = yield* repository.findById(runId)
      if (run === null) return yield* new RunNotFound({ id: runId })
      yield* monitors.findById(userId, run.monitorId)
      const content = yield* repository.latestSnapshot(runId)
      if (content === null) return yield* new RunNotFound({ id: runId })
      const reference = yield* repository.screenshotReference(runId)
      return { runId, content, screenshotUrl: reference === null ? null : screenshotPath(runId) }
    })

    const screenshot = Effect.fn(SPAN.runs.findById)(function* (userId: UserId, runId: RunId) {
      const run = yield* repository.findById(runId)
      if (run === null) return yield* new RunNotFound({ id: runId })
      yield* monitors.findById(userId, run.monitorId)

      const reference = yield* repository.screenshotReference(runId)
      if (reference === null) return yield* new ScreenshotNotFound({ id: runId })

      const bytes = yield* store.get(reference)
      if (bytes === null) return yield* new ScreenshotNotFound({ id: runId })
      return bytes
    })

    const diffAgainst = Effect.fn(SPAN.runs.diff)(function* (
      runId: RunId,
      baseline: { readonly id: RunId },
    ) {
      const current = yield* repository.latestSnapshot(runId)
      const previous = yield* repository.latestSnapshot(baseline.id)
      if (current === null || previous === null) {
        return { runId, againstRunId: baseline.id, hunks: [] }
      }
      return { runId, againstRunId: baseline.id, hunks: diffText(previous, current) }
    })

    const diff = Effect.fn(SPAN.runs.diff)(function* (
      userId: UserId,
      runId: RunId,
      againstId: RunId | null,
    ) {
      const run = yield* repository.findById(runId)
      if (run === null) return yield* new RunNotFound({ id: runId })
      yield* monitors.findById(userId, run.monitorId)

      if (againstId === null) {
        const previous = yield* repository.previousSuccessful(run.monitorId, run.startedAt)
        if (previous === null) return { runId, againstRunId: null, hunks: [] }
        return yield* diffAgainst(runId, previous)
      }

      const named = yield* repository.findById(againstId)
      if (named?.monitorId !== run.monitorId) {
        return yield* new RunNotFound({ id: againstId })
      }
      return yield* diffAgainst(runId, named)
    })

    const series = Effect.fn(SPAN.runs.series)(function* (
      userId: UserId,
      monitorId: MonitorId,
      query: SeriesQuery,
    ) {
      yield* monitors.findById(userId, monitorId)

      const extractorKey = query.extractorKey ?? ""
      if (extractorKey === "") {
        return yield* new ValidationFailed({
          issues: [{ path: [SERIES_EXTRACTOR_FIELD], messageKey: MSG.errors.validationFailed }],
        })
      }

      const key = extractorKey as ExtractorKey
      const bucket = toBucket(query.bucket)
      const points = yield* repository.series(monitorId, {
        extractorKey: key,
        from: toDate(query.from),
        to: toDate(query.to),
        bucket,
      })

      return {
        monitorId,
        extractorKey: key,
        bucket,
        points: points.map((point) => ({
          at: point.at.toISOString(),
          value: point.value,
          min: point.min,
          max: point.max,
          count: point.count,
        })),
      }
    })

    const activity = Effect.fn(SPAN.runs.listChanges)(function* (userId: UserId, query: PageQuery) {
      return yield* repository.listUserChanges(userId, {
        cursor: query.cursor,
        limit: toLimit(query.limit),
      })
    })

    return {
      list,
      listChanges,
      series,
      findById,
      trigger,
      snapshot,
      screenshot,
      diff,
      activity,
    } as const
  }),
  dependencies: [
    RunRepository.Default,
    MonitorRepository.Default,
    JobProducer.Default,
    ArtifactStore.Default,
  ],
}) {}

export const RunsLive = Runs.Default

export { PAGINATION } from "@scraper/core/constants"
