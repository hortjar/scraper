export const RULE_PLUGIN = {
  routes: "rules/routes",
  handlers: "rules/handlers",
  monitorRoutes: "rules/monitor-routes",
  monitorHandlers: "rules/monitor-handlers",
} as const

export const RULE_PATH = {
  byId: "/:ruleId",
  byMonitor: "/:monitorId/rules",
  preview: "/:ruleId/preview",
} as const

export const RULE_OPERATION_ID = {
  preview: "previewRule",
} as const

export const PREVIEW_CHANGE_LIMIT = 5
