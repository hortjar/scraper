import type { Change, Run } from "@scraper/core/domain"

import type { ChangeDto, FieldValueDto, RunDetailDto, RunDto } from "./runs.schema.js"

const iso = (value: Date | null): string | null => value?.toISOString() ?? null

export interface StoredFieldRow {
  readonly extractorKey: string
  readonly raw: string | null
  readonly valueText: string | null
  readonly valueNumber: string | null
  readonly valueBool: boolean | null
  readonly valueList: string[] | null
  readonly missing: boolean
}

export const toRunDto = (run: Run): RunDto => ({
  id: run.id,
  monitorId: run.monitorId,
  trigger: run.trigger,
  status: run.status,
  strategyUsed: run.strategyUsed,
  startedAt: run.startedAt.toISOString(),
  finishedAt: iso(run.finishedAt),
  durationMs: run.durationMs,
  httpStatus: run.httpStatus,
  bytes: run.bytes,
  changed: run.changed,
  errorKind: run.errorKind,
  errorMessage: run.errorMessage,
  attempt: run.attempt,
})

export const toFieldValueDto = (row: StoredFieldRow): FieldValueDto => ({
  extractorKey: row.extractorKey,
  raw: row.raw,
  valueText: row.valueText,
  valueNumber: row.valueNumber === null ? null : Number(row.valueNumber),
  valueBool: row.valueBool,
  valueList: row.valueList,
  missing: row.missing,
})

export const toRunDetailDto = (
  run: Run,
  fields: readonly StoredFieldRow[],
  screenshotUrl: string | null,
): RunDetailDto => ({
  ...toRunDto(run),
  fields: fields.map((field) => toFieldValueDto(field)),
  screenshotUrl,
})

export const toChangeDto = (change: Change): ChangeDto => ({
  id: change.id,
  monitorId: change.monitorId,
  runId: change.runId,
  previousRunId: change.previousRunId,
  extractorKey: change.extractorKey,
  changeKind: change.changeKind,
  oldValue: change.oldValue,
  newValue: change.newValue,
  oldNumber: change.oldNumber,
  newNumber: change.newNumber,
  deltaAbsolute: change.deltaAbsolute,
  deltaPercent: change.deltaPercent,
  diff: change.diff,
  createdAt: change.createdAt.toISOString(),
})
