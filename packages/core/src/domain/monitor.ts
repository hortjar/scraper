import { Schema } from "effect"

import {
  BROWSER_STEP_KIND,
  ENGINE,
  IGNORE_RULE_KIND,
  MONITOR_STATUS,
  OCCURRENCE,
  SCHEDULE_KIND,
  SELECTOR_KIND,
  STRATEGY,
  TRANSFORM_KIND,
  VALUE_TYPE,
} from "../constants/domain-values.js"
import { ExtractorId, MonitorId, UserId } from "./ids.js"
import {
  CronExpression,
  ExtractorKey,
  HttpUrl,
  NonEmptyString,
  NonNegativeInt,
  PositiveInt,
  Timezone,
} from "./primitives.js"

export const Engine = Schema.Literal(ENGINE.http, ENGINE.browser, ENGINE.auto)
export type Engine = typeof Engine.Type

export const StrategyKind = Schema.Literal(STRATEGY.http, STRATEGY.browser)
export type StrategyKind = typeof StrategyKind.Type

export const MonitorStatus = Schema.Literal(
  MONITOR_STATUS.ok,
  MONITOR_STATUS.degraded,
  MONITOR_STATUS.failing,
  MONITOR_STATUS.paused,
)
export type MonitorStatus = typeof MonitorStatus.Type

export const RequestOptions = Schema.Struct({
  method: Schema.optional(Schema.Literal("GET", "POST", "HEAD")),
  headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  cookies: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  body: Schema.optional(Schema.String),
  userAgent: Schema.optional(Schema.String),
  followRedirects: Schema.optional(Schema.Boolean),
  timeoutMs: Schema.optional(PositiveInt),
})
export type RequestOptions = typeof RequestOptions.Type

export const BrowserStep = Schema.Struct({
  kind: Schema.Literal(
    BROWSER_STEP_KIND.click,
    BROWSER_STEP_KIND.fill,
    BROWSER_STEP_KIND.select,
    BROWSER_STEP_KIND.scroll,
    BROWSER_STEP_KIND.waitFor,
  ),
  selector: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
  timeoutMs: Schema.optional(PositiveInt),
})
export type BrowserStep = typeof BrowserStep.Type

export const BrowserOptions = Schema.Struct({
  waitUntil: Schema.optional(Schema.Literal("load", "domcontentloaded", "networkidle")),
  waitForSelector: Schema.optional(Schema.String),
  waitMs: Schema.optional(NonNegativeInt),
  viewport: Schema.optional(Schema.Struct({ width: PositiveInt, height: PositiveInt })),
  blockResources: Schema.optional(Schema.Array(Schema.String)),
  steps: Schema.optional(Schema.Array(BrowserStep)),
  screenshot: Schema.optional(Schema.Boolean),
})
export type BrowserOptions = typeof BrowserOptions.Type

export const IgnoreRule = Schema.Struct({
  kind: Schema.Literal(IGNORE_RULE_KIND.selector, IGNORE_RULE_KIND.regex),
  value: NonEmptyString,
})
export type IgnoreRule = typeof IgnoreRule.Type

export const ScheduleKind = Schema.Literal(SCHEDULE_KIND.interval, SCHEDULE_KIND.cron)
export type ScheduleKind = typeof ScheduleKind.Type

export const Schedule = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal(SCHEDULE_KIND.interval),
    intervalSeconds: PositiveInt,
    timezone: Timezone,
  }),
  Schema.Struct({
    kind: Schema.Literal(SCHEDULE_KIND.cron),
    expression: CronExpression,
    timezone: Timezone,
  }),
)
export type Schedule = typeof Schedule.Type

export const SelectorKind = Schema.Literal(
  SELECTOR_KIND.css,
  SELECTOR_KIND.xpath,
  SELECTOR_KIND.jsonpath,
  SELECTOR_KIND.regex,
  SELECTOR_KIND.jsonLd,
  SELECTOR_KIND.wholePage,
)
export type SelectorKind = typeof SelectorKind.Type

export const ValueType = Schema.Literal(
  VALUE_TYPE.text,
  VALUE_TYPE.number,
  VALUE_TYPE.price,
  VALUE_TYPE.boolean,
  VALUE_TYPE.url,
  VALUE_TYPE.date,
  VALUE_TYPE.list,
)
export type ValueType = typeof ValueType.Type

export const Occurrence = Schema.Literal(
  OCCURRENCE.first,
  OCCURRENCE.last,
  OCCURRENCE.all,
  OCCURRENCE.nth,
)
export type Occurrence = typeof Occurrence.Type

export const Transform = Schema.Union(
  Schema.Struct({ kind: Schema.Literal(TRANSFORM_KIND.trim) }),
  Schema.Struct({ kind: Schema.Literal(TRANSFORM_KIND.lowercase) }),
  Schema.Struct({ kind: Schema.Literal(TRANSFORM_KIND.uppercase) }),
  Schema.Struct({ kind: Schema.Literal(TRANSFORM_KIND.collapseWhitespace) }),
  Schema.Struct({ kind: Schema.Literal(TRANSFORM_KIND.stripHtml) }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.regexExtract),
    pattern: NonEmptyString,
    group: Schema.optional(NonNegativeInt),
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.regexReplace),
    pattern: NonEmptyString,
    replacement: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.slice),
    start: NonNegativeInt,
    end: Schema.optional(NonNegativeInt),
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.parseNumber),
    locale: Schema.optional(Schema.String),
    decimal: Schema.optional(Schema.String),
    thousands: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.parsePrice),
    currency: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.parseDate),
    format: Schema.optional(Schema.String),
    timezone: Schema.optional(Timezone),
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.mapValues),
    mapping: Schema.Record({ key: Schema.String, value: Schema.String }),
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.defaultValue),
    value: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal(TRANSFORM_KIND.jsonPath),
    path: NonEmptyString,
  }),
)
export type Transform = typeof Transform.Type

export const Extractor = Schema.Struct({
  id: ExtractorId,
  monitorId: MonitorId,
  key: ExtractorKey,
  label: NonEmptyString,
  selectorKind: SelectorKind,
  selector: Schema.String,
  attribute: Schema.NullOr(Schema.String),
  valueType: ValueType,
  transforms: Schema.Array(Transform),
  occurrence: Occurrence,
  occurrenceIndex: Schema.NullOr(NonNegativeInt),
  required: Schema.Boolean,
  position: NonNegativeInt,
})
export type Extractor = typeof Extractor.Type

export const Monitor = Schema.Struct({
  id: MonitorId,
  userId: UserId,
  name: NonEmptyString,
  url: HttpUrl,
  engine: Engine,
  engineResolved: Schema.NullOr(StrategyKind),
  request: RequestOptions,
  browserOptions: BrowserOptions,
  schedule: Schedule,
  jitterSeconds: NonNegativeInt,
  enabled: Schema.Boolean,
  status: MonitorStatus,
  consecutiveFailures: NonNegativeInt,
  contentSelector: Schema.NullOr(Schema.String),
  ignoreRules: Schema.Array(IgnoreRule),
  respectRobots: Schema.Boolean,
  lastRunAt: Schema.NullOr(Schema.DateFromSelf),
  nextRunAt: Schema.NullOr(Schema.DateFromSelf),
  lastChangeAt: Schema.NullOr(Schema.DateFromSelf),
  tags: Schema.Array(Schema.String),
  archivedAt: Schema.NullOr(Schema.DateFromSelf),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})
export type Monitor = typeof Monitor.Type

export const MonitorConfig = Schema.Struct({
  id: MonitorId,
  url: HttpUrl,
  engine: Engine,
  engineResolved: Schema.NullOr(StrategyKind),
  request: RequestOptions,
  browserOptions: BrowserOptions,
  contentSelector: Schema.NullOr(Schema.String),
  ignoreRules: Schema.Array(IgnoreRule),
  respectRobots: Schema.Boolean,
  extractors: Schema.Array(Extractor),
})
export type MonitorConfig = typeof MonitorConfig.Type
