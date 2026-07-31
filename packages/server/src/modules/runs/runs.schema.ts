import {
  ChangeKind,
  DiffHunk,
  ExtractorKey,
  MonitorId,
  NonNegativeInt,
  RunId,
  RunStatus,
  RunTrigger,
} from "@scraper/core/domain"
import { Schema } from "effect"

export const RunIdParameters = Schema.Struct({ runId: RunId })
export const MonitorIdParameters = Schema.Struct({ monitorId: MonitorId })

export const PageQueryParameters = Schema.Struct({
  cursor: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.String),
})

export const RunDto = Schema.Struct({
  id: RunId,
  monitorId: MonitorId,
  trigger: RunTrigger,
  status: RunStatus,
  strategyUsed: Schema.NullOr(Schema.String),
  startedAt: Schema.String,
  finishedAt: Schema.NullOr(Schema.String),
  durationMs: Schema.NullOr(NonNegativeInt),
  httpStatus: Schema.NullOr(NonNegativeInt),
  bytes: Schema.NullOr(NonNegativeInt),
  changed: Schema.Boolean,
  errorKind: Schema.NullOr(Schema.String),
  errorMessage: Schema.NullOr(Schema.String),
  attempt: NonNegativeInt,
})
export type RunDto = typeof RunDto.Type

export const FieldValueDto = Schema.Struct({
  extractorKey: Schema.String,
  raw: Schema.NullOr(Schema.String),
  valueText: Schema.NullOr(Schema.String),
  valueNumber: Schema.NullOr(Schema.Number),
  valueBool: Schema.NullOr(Schema.Boolean),
  valueList: Schema.NullOr(Schema.Array(Schema.String)),
  missing: Schema.Boolean,
})
export type FieldValueDto = typeof FieldValueDto.Type

export const RunDetailDto = Schema.Struct({
  ...RunDto.fields,
  fields: Schema.Array(FieldValueDto),
})
export type RunDetailDto = typeof RunDetailDto.Type

export const ChangeDto = Schema.Struct({
  id: Schema.String,
  monitorId: MonitorId,
  runId: RunId,
  previousRunId: Schema.NullOr(RunId),
  extractorKey: Schema.NullOr(ExtractorKey),
  changeKind: ChangeKind,
  oldValue: Schema.NullOr(Schema.String),
  newValue: Schema.NullOr(Schema.String),
  oldNumber: Schema.NullOr(Schema.Number),
  newNumber: Schema.NullOr(Schema.Number),
  deltaAbsolute: Schema.NullOr(Schema.Number),
  deltaPercent: Schema.NullOr(Schema.Number),
  diff: Schema.NullOr(Schema.Array(DiffHunk)),
  createdAt: Schema.String,
})
export type ChangeDto = typeof ChangeDto.Type

export const RunDiffDto = Schema.Struct({
  runId: RunId,
  againstRunId: Schema.NullOr(RunId),
  hunks: Schema.Array(DiffHunk),
})

export const RunSnapshotDto = Schema.Struct({
  runId: RunId,
  content: Schema.String,
})

export const RunDiffQuery = Schema.Struct({ against: Schema.optional(Schema.String) })

export const RunListDto = Schema.Struct({
  items: Schema.Array(RunDto),
  nextCursor: Schema.NullOr(Schema.String),
})

export const ChangeListDto = Schema.Struct({
  items: Schema.Array(ChangeDto),
  nextCursor: Schema.NullOr(Schema.String),
})
