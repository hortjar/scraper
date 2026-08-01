import { RUN_STATUS, SPAN } from "@scraper/core/constants"
import type { ExtractorKey, MonitorId } from "@scraper/core/domain"
import type { Database } from "@scraper/db"
import { schema, withNumericColumns } from "@scraper/db"
import { and, asc, eq, isNotNull, sql } from "drizzle-orm"
import { Effect } from "effect"

import { MAX_SERIES_POINTS, SERIES_BUCKET, SERIES_NUMERIC_COLUMNS } from "./runs.constants.js"
import type { SeriesBucket } from "./runs.constants.js"
import { isoTimestamp } from "./runs.repository.rows.js"

export interface SeriesFilter {
  readonly extractorKey: ExtractorKey
  readonly from: Date | null
  readonly to: Date | null
  readonly bucket: SeriesBucket
}

export interface SeriesPoint {
  readonly at: Date
  readonly value: number
  readonly min: number
  readonly max: number
  readonly count: number
}

const BUCKET_EXPRESSION = {
  [SERIES_BUCKET.hour]: sql<Date>`date_trunc('hour', ${schema.runs.startedAt})`,
  [SERIES_BUCKET.day]: sql<Date>`date_trunc('day', ${schema.runs.startedAt})`,
} as const

const asDate = (value: unknown): Date => {
  if (value instanceof Date) return value
  return new Date(typeof value === "string" || typeof value === "number" ? value : 0)
}

const asPoint = (row: Record<string, unknown>): SeriesPoint => {
  const numeric = withNumericColumns(row, SERIES_NUMERIC_COLUMNS)
  const value = (numeric.value as number | null) ?? 0
  return {
    at: asDate(numeric.at),
    value,
    min: (numeric.min as number | null) ?? value,
    max: (numeric.max as number | null) ?? value,
    count: (numeric.count as number | null) ?? 1,
  }
}

const conditionsFor = (monitorId: MonitorId, filter: SeriesFilter) => {
  const conditions = [
    eq(schema.fieldValues.monitorId, monitorId),
    eq(schema.fieldValues.extractorKey, filter.extractorKey),
    eq(schema.runs.status, RUN_STATUS.success),
    isNotNull(schema.fieldValues.valueNumber),
  ]
  if (filter.from !== null) {
    conditions.push(sql`${schema.runs.startedAt} >= ${isoTimestamp(filter.from)}::timestamptz`)
  }
  if (filter.to !== null) {
    conditions.push(sql`${schema.runs.startedAt} <= ${isoTimestamp(filter.to)}::timestamptz`)
  }
  return and(...conditions)
}

export const makeSeriesQueries = (database: Database) => {
  const rawSeries = (monitorId: MonitorId, filter: SeriesFilter) =>
    database.query((executor) =>
      executor
        .select({
          at: schema.runs.startedAt,
          value: schema.fieldValues.valueNumber,
        })
        .from(schema.fieldValues)
        .innerJoin(schema.runs, eq(schema.fieldValues.runId, schema.runs.id))
        .where(conditionsFor(monitorId, filter))
        .orderBy(asc(schema.runs.startedAt))
        .limit(MAX_SERIES_POINTS),
    )

  const bucketedSeries = (
    monitorId: MonitorId,
    filter: SeriesFilter,
    bucketAt: (typeof BUCKET_EXPRESSION)[keyof typeof BUCKET_EXPRESSION],
  ) =>
    database.query((executor) =>
      executor
        .select({
          at: bucketAt,
          value: sql`avg(${schema.fieldValues.valueNumber})`,
          min: sql`min(${schema.fieldValues.valueNumber})`,
          max: sql`max(${schema.fieldValues.valueNumber})`,
          count: sql`count(*)`,
        })
        .from(schema.fieldValues)
        .innerJoin(schema.runs, eq(schema.fieldValues.runId, schema.runs.id))
        .where(conditionsFor(monitorId, filter))
        .groupBy(bucketAt)
        .orderBy(asc(bucketAt))
        .limit(MAX_SERIES_POINTS),
    )

  const series = Effect.fn(SPAN.runs.series)(function* (
    monitorId: MonitorId,
    filter: SeriesFilter,
  ) {
    const rows =
      filter.bucket === SERIES_BUCKET.raw
        ? yield* rawSeries(monitorId, filter)
        : yield* bucketedSeries(monitorId, filter, BUCKET_EXPRESSION[filter.bucket])

    return rows.map((row) => asPoint(row as Record<string, unknown>))
  })

  return { series } as const
}
