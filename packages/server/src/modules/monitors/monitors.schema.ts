import {
  BrowserOptions,
  Engine,
  type Extractor,
  ExtractorId,
  ExtractorKey,
  HttpUrl,
  IgnoreRule,
  type Monitor,
  MonitorId,
  NonEmptyString,
  NonNegativeInt,
  Occurrence,
  RequestOptions,
  Schedule,
  SelectorKind,
  Transform,
  ValueType,
} from "@scraper/core/domain"
import { Schema } from "effect"

export const ExtractorInput = Schema.Struct({
  key: ExtractorKey,
  label: NonEmptyString,
  selectorKind: SelectorKind,
  selector: Schema.String,
  attribute: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  valueType: ValueType,
  transforms: Schema.optionalWith(Schema.Array(Transform), { default: () => [] }),
  occurrence: Schema.optionalWith(Occurrence, { default: () => "first" as const }),
  occurrenceIndex: Schema.optionalWith(Schema.NullOr(NonNegativeInt), { default: () => null }),
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
})
export type ExtractorInput = typeof ExtractorInput.Type

export const CreateMonitorBody = Schema.Struct({
  name: NonEmptyString,
  url: HttpUrl,
  schedule: Schedule,
  engine: Schema.optionalWith(Engine, { default: () => "auto" as const }),
  request: Schema.optionalWith(RequestOptions, { default: () => ({}) }),
  browserOptions: Schema.optionalWith(BrowserOptions, { default: () => ({}) }),
  contentSelector: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  ignoreRules: Schema.optionalWith(Schema.Array(IgnoreRule), { default: () => [] }),
  respectRobots: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  jitterSeconds: Schema.optional(NonNegativeInt),
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  tags: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  extractors: Schema.optionalWith(Schema.Array(ExtractorInput), { default: () => [] }),
})
export type CreateMonitorBody = typeof CreateMonitorBody.Type

export const UpdateMonitorBody = Schema.Struct({
  name: Schema.optional(NonEmptyString),
  url: Schema.optional(HttpUrl),
  schedule: Schema.optional(Schedule),
  engine: Schema.optional(Engine),
  request: Schema.optional(RequestOptions),
  browserOptions: Schema.optional(BrowserOptions),
  contentSelector: Schema.optional(Schema.NullOr(Schema.String)),
  ignoreRules: Schema.optional(Schema.Array(IgnoreRule)),
  respectRobots: Schema.optional(Schema.Boolean),
  jitterSeconds: Schema.optional(NonNegativeInt),
  enabled: Schema.optional(Schema.Boolean),
  tags: Schema.optional(Schema.Array(Schema.String)),
  extractors: Schema.optional(Schema.Array(ExtractorInput)),
})
export type UpdateMonitorBody = typeof UpdateMonitorBody.Type

export const MonitorIdParameters = Schema.Struct({ monitorId: MonitorId })

export const ExtractorParameters = Schema.Struct({
  monitorId: MonitorId,
  extractorId: ExtractorId,
})

export const UpdateExtractorBody = Schema.Struct({
  key: Schema.optional(ExtractorKey),
  label: Schema.optional(NonEmptyString),
  selectorKind: Schema.optional(SelectorKind),
  selector: Schema.optional(Schema.String),
  attribute: Schema.optional(Schema.NullOr(Schema.String)),
  valueType: Schema.optional(ValueType),
  transforms: Schema.optional(Schema.Array(Transform)),
  occurrence: Schema.optional(Occurrence),
  occurrenceIndex: Schema.optional(Schema.NullOr(NonNegativeInt)),
  required: Schema.optional(Schema.Boolean),
})
export type UpdateExtractorBody = typeof UpdateExtractorBody.Type

export const PreviewMonitorBody = Schema.Struct({
  url: HttpUrl,
  engine: Schema.optionalWith(Engine, { default: () => "auto" as const }),
  request: Schema.optionalWith(RequestOptions, { default: () => ({}) }),
  browserOptions: Schema.optionalWith(BrowserOptions, { default: () => ({}) }),
  contentSelector: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  ignoreRules: Schema.optionalWith(Schema.Array(IgnoreRule), { default: () => [] }),
  respectRobots: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  extractors: Schema.optionalWith(Schema.Array(ExtractorInput), { default: () => [] }),
})
export type PreviewMonitorBody = typeof PreviewMonitorBody.Type

export const MonitorDto = Schema.Struct({
  id: MonitorId,
  name: Schema.String,
  url: Schema.String,
  engine: Engine,
  engineResolved: Schema.NullOr(Schema.String),
  schedule: Schedule,
  jitterSeconds: NonNegativeInt,
  enabled: Schema.Boolean,
  status: Schema.String,
  consecutiveFailures: NonNegativeInt,
  contentSelector: Schema.NullOr(Schema.String),
  respectRobots: Schema.Boolean,
  tags: Schema.Array(Schema.String),
  lastRunAt: Schema.NullOr(Schema.String),
  nextRunAt: Schema.NullOr(Schema.String),
  lastChangeAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
})
export type MonitorDto = typeof MonitorDto.Type

export const ExtractorDto = Schema.Struct({
  id: Schema.String,
  key: Schema.String,
  label: Schema.String,
  selectorKind: SelectorKind,
  selector: Schema.String,
  attribute: Schema.NullOr(Schema.String),
  valueType: ValueType,
  occurrence: Occurrence,
  occurrenceIndex: Schema.NullOr(NonNegativeInt),
  required: Schema.Boolean,
  position: NonNegativeInt,
})
export type ExtractorDto = typeof ExtractorDto.Type

export const MonitorDetailDto = Schema.Struct({
  ...MonitorDto.fields,
  extractors: Schema.Array(ExtractorDto),
})
export type MonitorDetailDto = typeof MonitorDetailDto.Type

export const ExtractorListDto = Schema.Struct({ items: Schema.Array(ExtractorDto) })

export const MonitorListDto = Schema.Struct({
  items: Schema.Array(MonitorDto),
  nextCursor: Schema.NullOr(Schema.String),
})

export const MonitorListQuery = Schema.Struct({
  cursor: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
})

export interface MonitorWithExtractors {
  readonly monitor: Monitor
  readonly extractors: readonly Extractor[]
}
