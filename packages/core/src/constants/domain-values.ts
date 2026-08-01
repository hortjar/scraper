export const LOG_LEVEL = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
} as const

export type LogLevelName = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL]

export const PERSISTED_LOG_LEVELS = [LOG_LEVEL.warn, LOG_LEVEL.error, LOG_LEVEL.fatal] as const

export const SERVICE_NAME = { api: "api", worker: "worker" } as const

export const USER_ROLE = { user: "user", admin: "admin" } as const
export const USER_STATUS = { active: "active", suspended: "suspended" } as const

export const TOKEN_PURPOSE = {
  emailVerify: "email_verify",
  passwordReset: "password_reset",
  channelVerify: "channel_verify",
} as const

export const ENGINE = { http: "http", browser: "browser", auto: "auto" } as const
export const STRATEGY = { http: "http", browser: "browser" } as const

export const MONITOR_STATUS = {
  ok: "ok",
  degraded: "degraded",
  failing: "failing",
  paused: "paused",
} as const

export const SCHEDULE_KIND = { interval: "interval", cron: "cron" } as const

export const SELECTOR_KIND = {
  css: "css",
  xpath: "xpath",
  jsonpath: "jsonpath",
  regex: "regex",
  jsonLd: "json_ld",
  wholePage: "whole_page",
} as const

export const VALUE_TYPE = {
  text: "text",
  number: "number",
  price: "price",
  boolean: "boolean",
  url: "url",
  date: "date",
  list: "list",
} as const

export const OCCURRENCE = { first: "first", last: "last", all: "all", nth: "nth" } as const

export const TRANSFORM_KIND = {
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
} as const

export const RUN_TRIGGER = {
  schedule: "schedule",
  manual: "manual",
  retry: "retry",
  test: "test",
} as const

export const RUN_STATUS = {
  queued: "queued",
  running: "running",
  success: "success",
  failed: "failed",
  skipped: "skipped",
} as const

export const CHANGE_KIND = {
  appeared: "appeared",
  disappeared: "disappeared",
  modified: "modified",
  increased: "increased",
  decreased: "decreased",
} as const

export const TRIGGER_KIND = {
  anyChange: "any_change",
  fieldChanged: "field_changed",
  numericThreshold: "numeric_threshold",
  percentChange: "percent_change",
  textContains: "text_contains",
  textNotContains: "text_not_contains",
  regexMatch: "regex_match",
  availability: "availability",
  runFailed: "run_failed",
  runRecovered: "run_recovered",
  noChangeFor: "no_change_for",
} as const

export const DELIVERY_MODE = { immediate: "immediate", digest: "digest" } as const

export const DELIVERY_STATUS = {
  pending: "pending",
  sent: "sent",
  failed: "failed",
  suppressed: "suppressed",
} as const

export const IGNORE_RULE_KIND = { selector: "selector", regex: "regex" } as const

export const BROWSER_STEP_KIND = {
  click: "click",
  fill: "fill",
  select: "select",
  scroll: "scroll",
  waitFor: "wait_for",
} as const

export const API_KEY_SCOPE = {
  monitorsRead: "monitors:read",
  monitorsWrite: "monitors:write",
  runsRead: "runs:read",
  channelsWrite: "channels:write",
} as const

export const STORAGE_DRIVER = { local: "local", s3: "s3" } as const
export const MAIL_DRIVER = { smtp: "smtp", resend: "resend", console: "console" } as const
export const APP_ENV = {
  development: "development",
  test: "test",
  production: "production",
} as const
export const AUTH_MODE = { local: "local", universal: "universal" } as const
export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE]
export const LOCALE = { en: "en", cs: "cs" } as const
