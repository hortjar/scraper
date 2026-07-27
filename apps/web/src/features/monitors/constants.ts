import { MONITOR_STATUS, type MonitorStatus } from "../../components/molecules/StatusPill.constants"

import { covering } from "./exhaustive"
import type {
  IgnoreRuleKind,
  MonitorEngine,
  Occurrence,
  ScheduleKind,
  SelectorKind,
  TransformKind,
  ValueType,
} from "./types"

export const MONITOR_ENGINE = covering<MonitorEngine>()({
  auto: "auto",
  http: "http",
  browser: "browser",
})

export const SCHEDULE_KIND = covering<ScheduleKind>()({
  interval: "interval",
  cron: "cron",
})

export const SELECTOR_KIND = covering<SelectorKind>()({
  css: "css",
  xpath: "xpath",
  jsonpath: "jsonpath",
  regex: "regex",
  jsonLd: "json_ld",
  wholePage: "whole_page",
})

export const VALUE_TYPE = covering<ValueType>()({
  text: "text",
  number: "number",
  price: "price",
  boolean: "boolean",
  url: "url",
  date: "date",
  list: "list",
})

export const OCCURRENCE = covering<Occurrence>()({
  first: "first",
  last: "last",
  all: "all",
  nth: "nth",
})

export const TRANSFORM_KIND = covering<TransformKind>()({
  trim: "trim",
  lowercase: "lowercase",
  uppercase: "uppercase",
  collapseWhitespace: "collapse_whitespace",
  stripHtml: "strip_html",
  regexExtract: "regex_extract",
  regexReplace: "regex_replace",
  slice: "slice",
  parseNumber: "parse_number",
  parsePrice: "parse_price",
  parseDate: "parse_date",
  mapValues: "map_values",
  defaultValue: "default",
  jsonPath: "json_path",
})

export const IGNORE_RULE_KIND = covering<IgnoreRuleKind>()({
  selector: "selector",
  regex: "regex",
})

export const MONITOR_ENGINES: readonly MonitorEngine[] = Object.values(MONITOR_ENGINE)
export const SCHEDULE_KINDS: readonly ScheduleKind[] = Object.values(SCHEDULE_KIND)
export const SELECTOR_KINDS: readonly SelectorKind[] = Object.values(SELECTOR_KIND)
export const VALUE_TYPES: readonly ValueType[] = Object.values(VALUE_TYPE)
export const OCCURRENCES: readonly Occurrence[] = Object.values(OCCURRENCE)
export const TRANSFORM_KINDS: readonly TransformKind[] = Object.values(TRANSFORM_KIND)
export const IGNORE_RULE_KINDS: readonly IgnoreRuleKind[] = Object.values(IGNORE_RULE_KIND)

export const MONITOR_DEFAULTS = {
  intervalSeconds: 3600,
  minIntervalSeconds: 60,
  occurrenceIndex: 0,
  extractorsMax: 30,
  transformsPerExtractorMax: 12,
  ignoreRulesMax: 50,
  tagsMax: 20,
  keyMaxLength: 64,
  nameMaxLength: 200,
} as const

export const MONITOR_LIST = {
  defaultLimit: 25,
  maxLimit: 100,
  limits: [10, 25, 50, 100],
} as const

export const DASHBOARD_LIMIT = 5

export const TAG_SEPARATOR = ","
export const MAPPING_SEPARATOR = "="

export const EXTRACTOR_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/u

export const toMonitorStatus = (value: string): MonitorStatus =>
  Object.hasOwn(MONITOR_STATUS, value) ? (value as MonitorStatus) : MONITOR_STATUS.paused
