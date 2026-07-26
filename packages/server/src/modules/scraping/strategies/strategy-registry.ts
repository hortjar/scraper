import { ENGINE, STRATEGY, type MonitorConfig } from "@scraper/core"

import type { ScrapeStrategy } from "./strategy.types.js"

export interface StrategyRegistryDependencies {
  readonly http: ScrapeStrategy
  readonly browser: ScrapeStrategy
}

export type EngineSelector = Pick<MonitorConfig, "engine" | "engineResolved">

export const resolveStrategy = (
  monitor: EngineSelector,
  dependencies: StrategyRegistryDependencies,
): ScrapeStrategy => {
  if (monitor.engine === ENGINE.http) return dependencies.http
  if (monitor.engine === ENGINE.browser) return dependencies.browser
  if (monitor.engineResolved === STRATEGY.browser) return dependencies.browser
  return dependencies.http
}
