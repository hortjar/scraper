export const MONITOR_ENTITY = "monitor"

export const EXTRACTOR_ENTITY = "extractor"

export const MONITOR_PLUGIN = {
  routes: "monitors/routes",
  handlers: "monitors/handlers",
} as const

export const MONITOR_OPERATION_ID = {
  list: "listMonitors",
  create: "createMonitor",
  get: "getMonitor",
  update: "updateMonitor",
  remove: "deleteMonitor",
  preview: "previewMonitor",
  runNow: "runMonitorNow",
} as const

export const MONITOR_PATH = {
  root: "",
  byId: "/:monitorId",
  preview: "/preview",
  runNow: "/:monitorId/run",
} as const

export const MONITOR_ACTION = {
  create: "monitor_create",
  update: "monitor_update",
  remove: "monitor_delete",
  preview: "monitor_preview",
  runNow: "monitor_run",
} as const

export const DEFAULT_JITTER_SECONDS = 30
