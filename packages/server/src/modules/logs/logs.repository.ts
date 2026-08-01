import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { LogLevelName } from "@scraper/core/constants"
import { Database, schema } from "@scraper/db"
import { and, desc, eq, lt, sql } from "drizzle-orm"
import { Effect } from "effect"

import { RedisClient } from "../redis/index.js"

import { parseRecord, type LogRecord } from "./log-record.js"
import {
  LOG_CURSOR_KEY,
  LOG_DRAIN_BATCH,
  LOG_FIELD_RECORD,
  LOG_STREAM_KEY,
  LOG_TAIL_LIMIT,
} from "./logs.constants.js"

export interface LogQuery {
  readonly level?: LogLevelName | undefined
  readonly service?: string | undefined
  readonly limit?: number | undefined
}

const START_ID = "0-0"

const recordsFrom = (entries: readonly [string, string[]][]): readonly LogRecord[] =>
  entries.flatMap(([, fields]) => {
    const index = fields.indexOf(LOG_FIELD_RECORD)
    const raw = index === -1 ? undefined : fields[index + 1]
    const record = raw === undefined ? null : parseRecord(raw)
    return record === null ? [] : [record]
  })

export class LogRepository extends Effect.Service<LogRepository>()(SERVICE_TAG.LogRepository, {
  effect: Effect.gen(function* () {
    const database = yield* Database
    const redis = yield* RedisClient

    const tail = Effect.fn(SPAN.logs.tail)(function* (query: LogQuery) {
      const limit = query.limit ?? LOG_TAIL_LIMIT
      const entries = yield* Effect.promise(() =>
        redis.client.xrevrange(LOG_STREAM_KEY, "+", "-", "COUNT", limit * 2),
      )

      return recordsFrom(entries as readonly [string, string[]][])
        .filter((record) => query.level === undefined || record.level === query.level)
        .filter((record) => query.service === undefined || record.service === query.service)
        .slice(0, limit)
    })

    const persisted = Effect.fn(SPAN.logs.persisted)(function* (query: LogQuery) {
      const conditions = [
        ...(query.level === undefined ? [] : [eq(schema.appLogs.level, query.level)]),
        ...(query.service === undefined ? [] : [eq(schema.appLogs.service, query.service)]),
      ]

      return yield* database.query((executor) =>
        executor
          .select()
          .from(schema.appLogs)
          .where(conditions.length === 0 ? undefined : and(...conditions))
          .orderBy(desc(schema.appLogs.at))
          .limit(query.limit ?? LOG_TAIL_LIMIT),
      )
    })

    const readCursor = () =>
      Effect.promise(() => redis.client.get(LOG_CURSOR_KEY)).pipe(
        Effect.map((value) => value ?? START_ID),
      )

    const drainBatch = Effect.fn(SPAN.logs.drain)(function* () {
      const cursor = yield* readCursor()
      const entries = (yield* Effect.promise(() =>
        redis.client.xrange(LOG_STREAM_KEY, `(${cursor}`, "+", "COUNT", LOG_DRAIN_BATCH),
      )) as readonly [string, string[]][]

      if (entries.length === 0) return { drained: 0, cursor }

      const lastId = entries.at(-1)?.[0] ?? cursor
      return { drained: entries.length, cursor: lastId, records: recordsFrom(entries) }
    })

    const insert = Effect.fn(SPAN.logs.drain)(function* (records: readonly LogRecord[]) {
      if (records.length === 0) return
      yield* database.query((executor) =>
        executor.insert(schema.appLogs).values(
          records.map((record) => ({
            at: new Date(record.at),
            level: record.level,
            service: record.service,
            message: record.message,
            annotations: record.annotations,
          })),
        ),
      )
    })

    const advanceCursor = (cursor: string) =>
      Effect.promise(() => redis.client.set(LOG_CURSOR_KEY, cursor))

    const prune = Effect.fn(SPAN.logs.drain)(function* (olderThan: Date) {
      yield* database.query((executor) =>
        executor
          .delete(schema.appLogs)
          .where(lt(schema.appLogs.at, sql`${olderThan.toISOString()}::timestamptz`)),
      )
    })

    return { tail, persisted, drainBatch, insert, advanceCursor, prune } as const
  }),
  dependencies: [Database.Default, RedisClient.Default],
}) {}

export const LogRepositoryLive = LogRepository.Default
