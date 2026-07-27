import {
  IGNORE_RULE_KIND,
  MONITOR_ENGINE,
  OCCURRENCE,
  SCHEDULE_KIND,
  SELECTOR_KIND,
  TRANSFORM_KIND,
  VALUE_TYPE,
} from "./constants"
import { TRANSFORM_FIELD, type TransformFieldName } from "./transforms"
import type {
  IgnoreRuleKind,
  MonitorEngine,
  Occurrence,
  ScheduleKind,
  SelectorKind,
  TransformKind,
  ValueType,
} from "./types"

export const ENGINE_LABEL = {
  [MONITOR_ENGINE.auto]: "engine.auto",
  [MONITOR_ENGINE.http]: "engine.http",
  [MONITOR_ENGINE.browser]: "engine.browser",
} as const satisfies Readonly<Record<MonitorEngine, string>>

export const SCHEDULE_KIND_LABEL = {
  [SCHEDULE_KIND.interval]: "schedule.interval",
  [SCHEDULE_KIND.cron]: "schedule.cron",
} as const satisfies Readonly<Record<ScheduleKind, string>>

export const SELECTOR_KIND_LABEL = {
  [SELECTOR_KIND.css]: "extractor.kinds.css",
  [SELECTOR_KIND.xpath]: "extractor.kinds.xpath",
  [SELECTOR_KIND.jsonpath]: "extractor.kinds.jsonpath",
  [SELECTOR_KIND.regex]: "extractor.kinds.regex",
  [SELECTOR_KIND.jsonLd]: "extractor.kinds.jsonLd",
  [SELECTOR_KIND.wholePage]: "extractor.kinds.wholePage",
} as const satisfies Readonly<Record<SelectorKind, string>>

export const VALUE_TYPE_LABEL = {
  [VALUE_TYPE.text]: "extractor.valueTypes.text",
  [VALUE_TYPE.number]: "extractor.valueTypes.number",
  [VALUE_TYPE.price]: "extractor.valueTypes.price",
  [VALUE_TYPE.boolean]: "extractor.valueTypes.boolean",
  [VALUE_TYPE.url]: "extractor.valueTypes.url",
  [VALUE_TYPE.date]: "extractor.valueTypes.date",
  [VALUE_TYPE.list]: "extractor.valueTypes.list",
} as const satisfies Readonly<Record<ValueType, string>>

export const OCCURRENCE_LABEL = {
  [OCCURRENCE.first]: "extractor.occurrences.first",
  [OCCURRENCE.last]: "extractor.occurrences.last",
  [OCCURRENCE.all]: "extractor.occurrences.all",
  [OCCURRENCE.nth]: "extractor.occurrences.nth",
} as const satisfies Readonly<Record<Occurrence, string>>

export const TRANSFORM_KIND_LABEL = {
  [TRANSFORM_KIND.trim]: "transform.kinds.trim",
  [TRANSFORM_KIND.lowercase]: "transform.kinds.lowercase",
  [TRANSFORM_KIND.uppercase]: "transform.kinds.uppercase",
  [TRANSFORM_KIND.collapseWhitespace]: "transform.kinds.collapseWhitespace",
  [TRANSFORM_KIND.stripHtml]: "transform.kinds.stripHtml",
  [TRANSFORM_KIND.regexExtract]: "transform.kinds.regexExtract",
  [TRANSFORM_KIND.regexReplace]: "transform.kinds.regexReplace",
  [TRANSFORM_KIND.slice]: "transform.kinds.slice",
  [TRANSFORM_KIND.parseNumber]: "transform.kinds.parseNumber",
  [TRANSFORM_KIND.parsePrice]: "transform.kinds.parsePrice",
  [TRANSFORM_KIND.parseDate]: "transform.kinds.parseDate",
  [TRANSFORM_KIND.mapValues]: "transform.kinds.mapValues",
  [TRANSFORM_KIND.defaultValue]: "transform.kinds.defaultValue",
  [TRANSFORM_KIND.jsonPath]: "transform.kinds.jsonPath",
} as const satisfies Readonly<Record<TransformKind, string>>

export const TRANSFORM_FIELD_LABEL = {
  [TRANSFORM_FIELD.pattern]: "transform.fields.pattern",
  [TRANSFORM_FIELD.replacement]: "transform.fields.replacement",
  [TRANSFORM_FIELD.group]: "transform.fields.group",
  [TRANSFORM_FIELD.start]: "transform.fields.start",
  [TRANSFORM_FIELD.end]: "transform.fields.end",
  [TRANSFORM_FIELD.value]: "transform.fields.value",
  [TRANSFORM_FIELD.path]: "transform.fields.path",
  [TRANSFORM_FIELD.format]: "transform.fields.format",
  [TRANSFORM_FIELD.timezone]: "transform.fields.timezone",
  [TRANSFORM_FIELD.currency]: "transform.fields.currency",
  [TRANSFORM_FIELD.locale]: "transform.fields.locale",
  [TRANSFORM_FIELD.decimal]: "transform.fields.decimal",
  [TRANSFORM_FIELD.thousands]: "transform.fields.thousands",
  [TRANSFORM_FIELD.mapping]: "transform.fields.mapping",
} as const satisfies Readonly<Record<TransformFieldName, string>>

export const IGNORE_RULE_KIND_LABEL = {
  [IGNORE_RULE_KIND.selector]: "ignoreRules.kinds.selector",
  [IGNORE_RULE_KIND.regex]: "ignoreRules.kinds.regex",
} as const satisfies Readonly<Record<IgnoreRuleKind, string>>

export const TOAST_KEY = {
  created: "toast.created",
  updated: "toast.updated",
  deleted: "toast.deleted",
  runQueued: "toast.runQueued",
  failed: "toast.failed",
} as const

export type ToastKey = (typeof TOAST_KEY)[keyof typeof TOAST_KEY]
