import { RUN_TRIGGER, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { MonitorId, RunId, UserId } from "@scraper/core/domain"
import { RunNotFound } from "@scraper/core/errors"
import { pageSize } from "@scraper/db"
import { Effect } from "effect"

import { JobProducer } from "../jobs/index.js"
import { MonitorRepository } from "../monitors/index.js"

import { FIRST_ATTEMPT } from "./runs.constants.js"
import { RunRepository } from "./runs.repository.js"

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
      return { run, fields }
    })

    const trigger = Effect.fn(SPAN.runs.trigger)(function* (userId: UserId, monitorId: MonitorId) {
      yield* monitors.findById(userId, monitorId)
      yield* jobs.enqueueScrape({
        monitorId,
        trigger: RUN_TRIGGER.manual,
        attempt: FIRST_ATTEMPT,
      })
    })

    return { list, listChanges, findById, trigger } as const
  }),
  dependencies: [RunRepository.Default, MonitorRepository.Default, JobProducer.Default],
}) {}

export const RunsLive = Runs.Default

export { PAGINATION } from "@scraper/core/constants"
