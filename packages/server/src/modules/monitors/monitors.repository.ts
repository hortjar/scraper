import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import {
  Extractor,
  Monitor,
  type ExtractorId,
  type MonitorId,
  type UserId,
} from "@scraper/core/domain"
import { MonitorNotFound } from "@scraper/core/errors"
import {
  constraintFailure,
  Database,
  decodeCursor,
  decodeRow,
  decodeRows,
  encodeCursor,
  schema,
  takePage,
} from "@scraper/db"
import { and, arrayContains, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import { Effect } from "effect"

import { EXTRACTOR_ENTITY, MONITOR_ENTITY } from "./monitors.constants.js"
import { isoTimestamp } from "./monitors.rows.js"
import type { ExtractorInput } from "./monitors.schema.js"

const decodeMonitor = decodeRow(Monitor, MONITOR_ENTITY)
const decodeMonitors = decodeRows(Monitor, MONITOR_ENTITY)
const decodeExtractors = decodeRows(Extractor, EXTRACTOR_ENTITY)

const ownedBy = (userId: UserId, id: MonitorId) =>
  and(
    eq(schema.monitors.id, id),
    eq(schema.monitors.userId, userId),
    isNull(schema.monitors.archivedAt),
  )

interface MonitorRow {
  readonly [key: string]: unknown
  readonly id: string
  readonly scheduleKind: string
  readonly scheduleValue: string
  readonly scheduleTimezone: string
  readonly createdAt: Date
}

const toDomainRow = (row: MonitorRow): Record<string, unknown> => {
  const { scheduleKind, scheduleTimezone, scheduleValue, ...rest } = row
  const schedule =
    scheduleKind === "cron"
      ? { kind: "cron", expression: scheduleValue, timezone: scheduleTimezone }
      : { kind: "interval", intervalSeconds: Number(scheduleValue), timezone: scheduleTimezone }
  return { ...rest, schedule }
}

export interface MonitorListFilter {
  readonly cursor?: string | undefined
  readonly limit: number
  readonly tag?: string | undefined
  readonly search?: string | undefined
}

export interface ScheduleColumns {
  readonly scheduleKind: "interval" | "cron"
  readonly scheduleValue: string
  readonly scheduleTimezone: string
}

export class MonitorRepository extends Effect.Service<MonitorRepository>()(
  SERVICE_TAG.MonitorRepository,
  {
    effect: Effect.gen(function* () {
      const database = yield* Database

      const findById = Effect.fn(SPAN.monitors.findById)(function* (userId: UserId, id: MonitorId) {
        const rows = yield* database.query((executor) =>
          executor.select().from(schema.monitors).where(ownedBy(userId, id)).limit(1),
        )
        const row = rows[0]
        if (row === undefined) return yield* new MonitorNotFound({ id })
        return yield* decodeMonitor(toDomainRow(row))
      })

      const listExtractors = Effect.fn(SPAN.monitors.findById)(function* (id: MonitorId) {
        const rows = yield* database.query((executor) =>
          executor
            .select()
            .from(schema.extractors)
            .where(eq(schema.extractors.monitorId, id))
            .orderBy(asc(schema.extractors.position)),
        )
        return yield* decodeExtractors(rows)
      })

      const list = Effect.fn(SPAN.monitors.list)(function* (
        userId: UserId,
        filter: MonitorListFilter,
      ) {
        const cursor = filter.cursor === undefined ? null : decodeCursor(filter.cursor)
        const conditions = [eq(schema.monitors.userId, userId), isNull(schema.monitors.archivedAt)]
        if (filter.tag !== undefined) {
          conditions.push(arrayContains(schema.monitors.tags, [filter.tag]))
        }
        if (filter.search !== undefined) {
          const pattern = `%${filter.search}%`
          const matches = or(
            ilike(schema.monitors.name, pattern),
            ilike(schema.monitors.url, pattern),
          )
          if (matches !== undefined) conditions.push(matches)
        }
        if (cursor !== null) {
          conditions.push(
            sql`(${schema.monitors.createdAt}, ${schema.monitors.id}) < (${isoTimestamp(new Date(cursor.at))}::timestamptz, ${cursor.id})`,
          )
        }

        const rows = yield* database.query((executor) =>
          executor
            .select()
            .from(schema.monitors)
            .where(and(...conditions))
            .orderBy(desc(schema.monitors.createdAt), desc(schema.monitors.id))
            .limit(filter.limit + 1),
        )

        const decoded = yield* decodeMonitors(rows.map((row) => toDomainRow(row as never)))
        return takePage(decoded, filter.limit, (monitor) => ({
          at: monitor.createdAt.toISOString(),
          id: monitor.id,
        }))
      })

      const insert = Effect.fn(SPAN.monitors.create)(function* (
        userId: UserId,
        values: Record<string, unknown>,
      ) {
        const rows = yield* database
          .query((executor) =>
            executor
              .insert(schema.monitors)
              .values({ ...values, userId } as never)
              .returning(),
          )
          .pipe(Effect.mapError((error) => constraintFailure(error, MONITOR_ENTITY)))
        return yield* decodeMonitor(toDomainRow(rows[0] as never))
      })

      const update = Effect.fn(SPAN.monitors.update)(function* (
        userId: UserId,
        id: MonitorId,
        values: Record<string, unknown>,
      ) {
        const rows = yield* database
          .query((executor) =>
            executor
              .update(schema.monitors)
              .set(values as never)
              .where(ownedBy(userId, id))
              .returning(),
          )
          .pipe(Effect.mapError((error) => constraintFailure(error, MONITOR_ENTITY)))
        const row = rows[0]
        if (row === undefined) return yield* new MonitorNotFound({ id })
        return yield* decodeMonitor(toDomainRow(row))
      })

      const archive = Effect.fn(SPAN.monitors.remove)(function* (
        userId: UserId,
        id: MonitorId,
        now: Date,
      ) {
        const rows = yield* database.query((executor) =>
          executor
            .update(schema.monitors)
            .set({ archivedAt: now, enabled: false })
            .where(ownedBy(userId, id))
            .returning({ id: schema.monitors.id }),
        )
        if (rows.length === 0) return yield* new MonitorNotFound({ id })
      })

      const replaceExtractors = Effect.fn(SPAN.monitors.update)(function* (
        id: MonitorId,
        inputs: readonly ExtractorInput[],
      ) {
        yield* database.query((executor) =>
          executor.delete(schema.extractors).where(eq(schema.extractors.monitorId, id)),
        )
        if (inputs.length === 0) return
        yield* database
          .query((executor) =>
            executor.insert(schema.extractors).values(
              inputs.map((input, position) => ({
                monitorId: id,
                key: input.key,
                label: input.label,
                selectorKind: input.selectorKind,
                selector: input.selector,
                attribute: input.attribute,
                valueType: input.valueType,
                transforms: [...input.transforms],
                occurrence: input.occurrence,
                occurrenceIndex: input.occurrenceIndex,
                required: input.required,
                position,
              })) as never,
            ),
          )
          .pipe(Effect.mapError((error) => constraintFailure(error, EXTRACTOR_ENTITY)))
      })

      const findAnyById = Effect.fn(SPAN.monitors.findById)(function* (id: MonitorId) {
        const rows = yield* database.query((executor) =>
          executor.select().from(schema.monitors).where(eq(schema.monitors.id, id)).limit(1),
        )
        const row = rows[0]
        if (row === undefined) return yield* new MonitorNotFound({ id })
        return yield* decodeMonitor(toDomainRow(row))
      })

      const recordRunOutcome = Effect.fn(SPAN.monitors.update)(function* (
        id: MonitorId,
        values: Record<string, unknown>,
      ) {
        yield* database.query((executor) =>
          executor
            .update(schema.monitors)
            .set(values as never)
            .where(eq(schema.monitors.id, id)),
        )
      })

      const countActive = Effect.fn(SPAN.monitors.list)(function* (userId: UserId) {
        const rows = yield* database.query((executor) =>
          executor
            .select({ total: sql<number>`count(*)::int` })
            .from(schema.monitors)
            .where(and(eq(schema.monitors.userId, userId), isNull(schema.monitors.archivedAt))),
        )
        return rows[0]?.total ?? 0
      })

      return {
        findById,
        findAnyById,
        recordRunOutcome,
        listExtractors,
        list,
        insert,
        update,
        archive,
        replaceExtractors,
        countActive,
      } as const
    }),
    dependencies: [Database.Default],
  },
) {}

export const MonitorRepositoryLive = MonitorRepository.Default

export const cursorFor = (at: Date, id: ExtractorId | MonitorId): string =>
  encodeCursor({ at: at.toISOString(), id })

export { lt as beforeCursor } from "drizzle-orm"
