export const RULE_PLUGIN = {
  routes: "rules/routes",
  handlers: "rules/handlers",
  monitorRoutes: "rules/monitor-routes",
  monitorHandlers: "rules/monitor-handlers",
} as const

export const RULE_PATH = {
  byId: "/:ruleId",
  byMonitor: "/:monitorId/rules",
} as const
