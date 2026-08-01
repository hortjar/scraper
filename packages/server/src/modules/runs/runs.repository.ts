import { RUN_STATUS, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { Change, Run, type MonitorId, type RunId, type UserId } from "@scraper/core/domain"
import {
  constraintFailure,
  Database,
  decodeCursor,
  decodeRow,
  decodeRows,
  schema,
  takePage,
  toDomainChange,
} from "@scraper/db"
import { and, desc, eq, isNotNull, sql } from "drizzle-orm"
import { Effect } from "effect"

import type { ChangeDraft } from "./diff/field-diff.js"
import { CHANGE_ENTITY, RUN_ENTITY } from "./runs.constants.js"
import { hashColumn, numeric, isoTimestamp, toDomainRun } from "./runs.repository.rows.js"
import type {
  FieldValueInput,
  FinishRunInput,
  RunListFilter,
  StartRunInput,
} from "./runs.repository.types.js"
import { makeSeriesQueries } from "./series.repository.js"
import { makeSnapshotQueries } from "./snapshots.repository.js"

const decodeRunRow = decodeRow(Run, RUN_ENTITY)
const decodeRunRows = decodeRows(Run, RUN_ENTITY)
const decodeChangeRows = decodeRows(Change, CHANGE_ENTITY)

export class RunRepository extends Effect.Service<RunRepository>()(SERVICE_TAG.RunRepository, {
  effect: Effect.gen(function* () {
    const database = yield* Database

    const findByJobId = Effect.fn(SPAN.runRepository.findByJobId)(function* (jobId: string) {
      const rows = yield* database.query((executor) =>
        executor
          .select()
          .from(schema.runs)
          .where(eq(schema.runs.jobId, jobId))
          .orderBy(desc(schema.runs.startedAt))
          .limit(1),
      )
      const row = rows[0]
      return row === undefined ? null : yield* decodeRunRow(toDomainRun(row))
    })

    const start = Effect.fn(SPAN.runRepository.start)(function* (input: StartRunInput) {
      const rows = yield* database
        .query((executor) =>
          executor
            .insert(schema.runs)
            .values({
              monitorId: input.monitorId,
              trigger: input.trigger,
              status: RUN_STATUS.running,
              startedAt: input.startedAt,
              attempt: input.attempt,
              jobId: input.jobId,
            })
            .returning(),
        )
        .pipe(Effect.mapError((error) => constraintFailure(error, RUN_ENTITY)))
      return yield* decodeRunRow(toDomainRun(rows[0] as never))
    })

    const finish = Effect.fn(SPAN.runRepository.finish)(function* (
      runId: RunId,
      input: FinishRunInput,
    ) {
      yield* database.query((executor) =>
        executor
          .update(schema.runs)
          .set({
            status: input.status,
            finishedAt: input.finishedAt,
            durationMs: input.durationMs,
            changed: input.changed,
            strategyUsed: input.strategyUsed ?? null,
            httpStatus: input.httpStatus ?? null,
            bytes: input.bytes ?? null,
            contentHash: hashColumn(input.contentHash),
            errorKind: input.errorKind ?? null,
            errorMessage: input.errorMessage ?? null,
          })
          .where(eq(schema.runs.id, runId)),
      )
    })

    const previousSuccessful = Effect.fn(SPAN.runRepository.previousSuccessful)(function* (
      monitorId: MonitorId,
      before: Date,
    ) {
      const rows = yield* database.query((executor) =>
        executor
          .select()
          .from(schema.runs)
          .where(
            and(
              eq(schema.runs.monitorId, monitorId),
              eq(schema.runs.status, RUN_STATUS.success),
              isNotNull(schema.runs.contentHash),
              sql`${schema.runs.startedAt} < ${isoTimestamp(before)}::timestamptz`,
            ),
          )
          .orderBy(desc(schema.runs.startedAt))
          .limit(1),
      )
      const row = rows[0]
      return row === undefined ? null : yield* decodeRunRow(toDomainRun(row))
    })

    const insertFieldValues = Effect.fn(SPAN.runRepository.insertFieldValues)(function* (
      runId: RunId,
      monitorId: MonitorId,
      values: readonly FieldValueInput[],
    ) {
      if (values.length === 0) return
      yield* database.query((executor) =>
        executor.insert(schema.fieldValues).values(
          values.map((value) => ({
            runId,
            monitorId,
            extractorKey: value.extractorKey,
            raw: value.raw,
            valueText: value.valueText,
            valueNumber: numeric(value.valueNumber),
            valueBool: value.valueBool,
            valueList: value.valueList === null ? null : [...value.valueList],
            missing: value.missing,
          })),
        ),
      )
    })

    const fieldValues = Effect.fn(SPAN.runRepository.fieldValues)(function* (runId: RunId) {
      return yield* database.query((executor) =>
        executor.select().from(schema.fieldValues).where(eq(schema.fieldValues.runId, runId)),
      )
    })

    const insertChanges = Effect.fn(SPAN.runRepository.insertChanges)(function* (
      runId: RunId,
      monitorId: MonitorId,
      previousRunId: RunId | null,
      drafts: readonly ChangeDraft[],
    ) {
      if (drafts.length === 0) return []
      const rows = yield* database.query((executor) =>
        executor
          .insert(schema.changes)
          .values(
            drafts.map((draft) => ({
              monitorId,
              runId,
              previousRunId,
              extractorKey: draft.extractorKey,
              changeKind: draft.changeKind,
              oldValue: draft.oldValue,
              newValue: draft.newValue,
              oldNumber: numeric(draft.oldNumber),
              newNumber: numeric(draft.newNumber),
              deltaAbsolute: numeric(draft.deltaAbsolute),
              deltaPercent: numeric(draft.deltaPercent),
              diff: draft.diff === null ? null : [...draft.diff],
            })),
          )
          .onConflictDoNothing({
            target: [schema.changes.runId, schema.changes.extractorKey, schema.changes.changeKind],
          })
          .returning(),
      )
      return yield* decodeChangeRows(rows.map((row) => toDomainChange(row)))
    })

    const snapshots = makeSnapshotQueries(database)
    const seriesQueries = makeSeriesQueries(database)

    const list = Effect.fn(SPAN.runRepository.list)(function* (
      monitorId: MonitorId,
      filter: RunListFilter,
    ) {
      const cursor = filter.cursor === undefined ? null : decodeCursor(filter.cursor)
      const conditions = [eq(schema.runs.monitorId, monitorId)]
      if (cursor !== null) {
        conditions.push(
          sql`(${schema.runs.startedAt}, ${schema.runs.id}) < (${isoTimestamp(new Date(cursor.at))}::timestamptz, ${cursor.id})`,
        )
      }
      const rows = yield* database.query((executor) =>
        executor
          .select()
          .from(schema.runs)
          .where(and(...conditions))
          .orderBy(desc(schema.runs.startedAt), desc(schema.runs.id))
          .limit(filter.limit + 1),
      )
      const decoded = yield* decodeRunRows(rows.map((row) => toDomainRun(row)))
      return takePage(decoded, filter.limit, (run) => ({
        at: run.startedAt.toISOString(),
        id: run.id,
      }))
    })

    const listUserChanges = Effect.fn(SPAN.runRepository.listChanges)(function* (
      userId: UserId,
      filter: RunListFilter,
    ) {
      const cursor = filter.cursor === undefined ? null : decodeCursor(filter.cursor)
      const conditions = [eq(schema.monitors.userId, userId)]
      if (cursor !== null) {
        conditions.push(
          sql`(${schema.changes.createdAt}, ${schema.changes.id}) < (${isoTimestamp(new Date(cursor.at))}::timestamptz, ${cursor.id})`,
        )
      }
      const rows = yield* database.query((executor) =>
        executor
          .select({ change: schema.changes })
          .from(schema.changes)
          .innerJoin(schema.monitors, eq(schema.changes.monitorId, schema.monitors.id))
          .where(and(...conditions))
          .orderBy(desc(schema.changes.createdAt), desc(schema.changes.id))
          .limit(filter.limit + 1),
      )
      const decoded = yield* decodeChangeRows(rows.map((row) => toDomainChange(row.change)))
      return takePage(decoded, filter.limit, (change) => ({
        at: change.createdAt.toISOString(),
        id: change.id,
      }))
    })

    const findById = Effect.fn(SPAN.runRepository.findById)(function* (runId: RunId) {
      const rows = yield* database.query((executor) =>
        executor.select().from(schema.runs).where(eq(schema.runs.id, runId)).limit(1),
      )
      const row = rows[0]
      return row === undefined ? null : yield* decodeRunRow(toDomainRun(row))
    })

    const listChanges = Effect.fn(SPAN.runRepository.listChanges)(function* (
      monitorId: MonitorId,
      filter: RunListFilter,
    ) {
      const cursor = filter.cursor === undefined ? null : decodeCursor(filter.cursor)
      const conditions = [eq(schema.changes.monitorId, monitorId)]
      if (cursor !== null) {
        conditions.push(
          sql`(${schema.changes.createdAt}, ${schema.changes.id}) < (${isoTimestamp(new Date(cursor.at))}::timestamptz, ${cursor.id})`,
        )
      }
      const rows = yield* database.query((executor) =>
        executor
          .select()
          .from(schema.changes)
          .where(and(...conditions))
          .orderBy(desc(schema.changes.createdAt), desc(schema.changes.id))
          .limit(filter.limit + 1),
      )
      const decoded = yield* decodeChangeRows(rows.map((row) => toDomainChange(row)))
      return takePage(decoded, filter.limit, (change) => ({
        at: change.createdAt.toISOString(),
        id: change.id,
      }))
    })

    return {
      findByJobId,
      start,
      finish,
      previousSuccessful,
      insertFieldValues,
      fieldValues,
      insertChanges,
      ...snapshots,
      ...seriesQueries,
      list,
      findById,
      listChanges,
      listUserChanges,
    } as const
  }),
  dependencies: [Database.Default],
}) {}

export const RunRepositoryLive = RunRepository.Default

export {
  type FieldValueInput,
  type FinishRunInput,
  type RunListFilter,
  type StartRunInput,
} from "./runs.repository.types.js"
