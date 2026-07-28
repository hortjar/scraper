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
  enable: "enableMonitor",
  disable: "disableMonitor",
  duplicate: "duplicateMonitor",
} as const

export const MONITOR_PATH = {
  root: "",
  byId: "/:monitorId",
  preview: "/preview",
  runNow: "/:monitorId/run",
  enable: "/:monitorId/enable",
  disable: "/:monitorId/disable",
  duplicate: "/:monitorId/duplicate",
} as const

export const MONITOR_ACTION = {
  create: "monitor_create",
  update: "monitor_update",
  remove: "monitor_delete",
  preview: "monitor_preview",
  runNow: "monitor_run",
  enable: "monitor_enable",
  disable: "monitor_disable",
  duplicate: "monitor_duplicate",
} as const

export const DEFAULT_JITTER_SECONDS = 30

export const PREVIEW_MONITOR_ID = "00000000-0000-4000-8000-000000000000"

export const DUPLICATE_NAME_SUFFIX = " (copy)"
