import type { RootConfig } from "@scraper/core/config"
import type { PlanLimits } from "@scraper/core/domain"

import { DEFAULT_MAX_CHANNELS } from "../auth.constants.js"

export const planLimitsFrom = (config: RootConfig): PlanLimits => ({
  maxMonitors: config.scraping.maxMonitorsPerUser,
  minIntervalSeconds: config.scraping.minIntervalSeconds,
  maxChannels: DEFAULT_MAX_CHANNELS,
})
