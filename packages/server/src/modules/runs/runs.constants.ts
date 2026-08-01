export const RUN_ENTITY = "run"
export const CHANGE_ENTITY = "change"
export const FIELD_VALUE_ENTITY = "field_value"
export const SNAPSHOT_ENTITY = "snapshot"

export const DIFF_CONTEXT_LINES = 2
export const MAX_DIFF_HUNKS = 400
export const MAX_HUNK_CHARACTERS = 4000

export const DEDUPE_TTL_FLOOR_SECONDS = 3600

export const BROWSER_UNAVAILABLE_REASON = "browser_unavailable"
export const UNKNOWN_ERROR_DETAIL = "unknown"

export const MONITOR_DISABLED_REASON = "monitor_disabled"
export const MONITOR_ARCHIVED_REASON = "monitor_archived"

export const WHOLE_PAGE_KEY = null

export const LINE_SEPARATOR = "\n"
export const LIST_SEPARATOR = ", "

export const HASH_FIELD_SEPARATOR = "\u{1F}"
export const HASH_RECORD_SEPARATOR = "\u{1E}"

export const RUN_PLUGIN = {
  routes: "runs/routes",
  monitorHandlers: "runs/monitor-handlers",
  runHandlers: "runs/run-handlers",
  activityHandlers: "runs/activity-handlers",
} as const

export const SERIES_BUCKET = {
  raw: "raw",
  hour: "hour",
  day: "day",
} as const

export type SeriesBucket = (typeof SERIES_BUCKET)[keyof typeof SERIES_BUCKET]

export const SERIES_NUMERIC_COLUMNS = ["value", "min", "max", "count"] as const

export const MAX_SERIES_POINTS = 1000

export const SERIES_EXTRACTOR_FIELD = "extractorKey"

export const RUN_PATH = {
  monitorRuns: "/:monitorId/runs",
  monitorChanges: "/:monitorId/changes",
  monitorSeries: "/:monitorId/series",
  runNow: "/:monitorId/run",
  byId: "/:runId",
  diff: "/:runId/diff",
  snapshot: "/:runId/snapshot",
  screenshot: "/:runId/screenshot",
  screenshotSuffix: "/screenshot",
  activity: "",
} as const

export const RUN_OPERATION_ID = {
  list: "listRuns",
  listChanges: "listChanges",
  series: "getMonitorSeries",
  get: "getRun",
  runNow: "runMonitorNow",
  diff: "getRunDiff",
  snapshot: "getRunSnapshot",
  screenshot: "getRunScreenshot",
  activity: "listActivity",
} as const

export const RUN_ACTION = {
  runNow: "monitor_run",
} as const
