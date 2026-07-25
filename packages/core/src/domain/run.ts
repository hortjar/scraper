import { Schema } from "effect"

import { CHANGE_KIND, RUN_STATUS, RUN_TRIGGER } from "../constants/domain-values.js"

import { ChangeId, MonitorId, RunId, SnapshotId } from "./ids.js"
import { StrategyKind } from "./monitor.js"
import { ExtractorKey, NonNegativeInt } from "./primitives.js"

export const RunTrigger = Schema.Literal(
  RUN_TRIGGER.schedule,
  RUN_TRIGGER.manual,
  RUN_TRIGGER.retry,
  RUN_TRIGGER.test,
)
export type RunTrigger = typeof RunTrigger.Type

export const RunStatus = Schema.Literal(
  RUN_STATUS.running,
  RUN_STATUS.success,
  RUN_STATUS.failed,
  RUN_STATUS.skipped,
)
export type RunStatus = typeof RunStatus.Type

export const Run = Schema.Struct({
  id: RunId,
  monitorId: MonitorId,
  trigger: RunTrigger,
  status: RunStatus,
  strategyUsed: Schema.NullOr(StrategyKind),
  startedAt: Schema.DateFromSelf,
  finishedAt: Schema.NullOr(Schema.DateFromSelf),
  durationMs: Schema.NullOr(NonNegativeInt),
  httpStatus: Schema.NullOr(NonNegativeInt),
  bytes: Schema.NullOr(NonNegativeInt),
  contentHash: Schema.NullOr(Schema.String),
  changed: Schema.Boolean,
  errorKind: Schema.NullOr(Schema.String),
  errorMessage: Schema.NullOr(Schema.String),
  attempt: NonNegativeInt,
  jobId: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
})
export type Run = typeof Run.Type

export const FieldValue = Schema.Struct({
  runId: RunId,
  monitorId: MonitorId,
  extractorKey: ExtractorKey,
  raw: Schema.NullOr(Schema.String),
  valueText: Schema.NullOr(Schema.String),
  valueNumber: Schema.NullOr(Schema.Number),
  valueBool: Schema.NullOr(Schema.Boolean),
  missing: Schema.Boolean,
})
export type FieldValue = typeof FieldValue.Type

export const Snapshot = Schema.Struct({
  id: SnapshotId,
  runId: RunId,
  monitorId: MonitorId,
  content: Schema.String,
  rawRef: Schema.NullOr(Schema.String),
  screenshotRef: Schema.NullOr(Schema.String),
  sizeBytes: NonNegativeInt,
  createdAt: Schema.DateFromSelf,
})
export type Snapshot = typeof Snapshot.Type

export const ChangeKind = Schema.Literal(
  CHANGE_KIND.appeared,
  CHANGE_KIND.disappeared,
  CHANGE_KIND.modified,
  CHANGE_KIND.increased,
  CHANGE_KIND.decreased,
)
export type ChangeKind = typeof ChangeKind.Type

export const DiffHunk = Schema.Struct({
  kind: Schema.Literal("added", "removed", "unchanged"),
  value: Schema.String,
})
export type DiffHunk = typeof DiffHunk.Type

export const Change = Schema.Struct({
  id: ChangeId,
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
  createdAt: Schema.DateFromSelf,
})
export type Change = typeof Change.Type

export const ScrapeResponse = Schema.Struct({
  html: Schema.String,
  finalUrl: Schema.String,
  httpStatus: NonNegativeInt,
  headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  strategy: StrategyKind,
  screenshot: Schema.optional(Schema.Uint8ArrayFromSelf),
  timings: Schema.Struct({
    totalMs: NonNegativeInt,
    ttfbMs: Schema.optional(NonNegativeInt),
  }),
})
export type ScrapeResponse = typeof ScrapeResponse.Type

export const ExtractedField = Schema.Struct({
  key: ExtractorKey,
  raw: Schema.NullOr(Schema.String),
  valueText: Schema.NullOr(Schema.String),
  valueNumber: Schema.NullOr(Schema.Number),
  valueBool: Schema.NullOr(Schema.Boolean),
  valueList: Schema.NullOr(Schema.Array(Schema.String)),
  missing: Schema.Boolean,
})
export type ExtractedField = typeof ExtractedField.Type

export const PreviewResult = Schema.Struct({
  finalUrl: Schema.String,
  httpStatus: NonNegativeInt,
  strategyUsed: StrategyKind,
  title: Schema.NullOr(Schema.String),
  durationMs: NonNegativeInt,
  fields: Schema.Array(ExtractedField),
  normalizedPreview: Schema.String,
  screenshotRef: Schema.NullOr(Schema.String),
  warnings: Schema.Array(
    Schema.Struct({
      code: Schema.String,
      messageKey: Schema.String,
      params: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
    }),
  ),
})
export type PreviewResult = typeof PreviewResult.Type
