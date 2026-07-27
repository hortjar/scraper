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

export const FIRST_ATTEMPT = 1

export const WHOLE_PAGE_KEY = null

export const LINE_SEPARATOR = "\n"
export const LIST_SEPARATOR = ", "

export const HASH_FIELD_SEPARATOR = "\u{1F}"
export const HASH_RECORD_SEPARATOR = "\u{1E}"

export const RUN_PLUGIN = {
  routes: "runs/routes",
  monitorHandlers: "runs/monitor-handlers",
  runHandlers: "runs/run-handlers",
} as const

export const RUN_PATH = {
  monitorRuns: "/:monitorId/runs",
  monitorChanges: "/:monitorId/changes",
  runNow: "/:monitorId/run",
  byId: "/:runId",
} as const

export const RUN_OPERATION_ID = {
  list: "listRuns",
  listChanges: "listChanges",
  get: "getRun",
  runNow: "runMonitorNow",
} as const

export const RUN_ACTION = {
  runNow: "monitor_run",
} as const
