import type { MonitorConfig, ScrapeResponse, StrategyKind } from "@scraper/core"
import type { Effect } from "effect"

import type { FetchError } from "../scraping.errors.js"
import type { ScrapeRequest } from "../scraping.schema.js"

export interface ScrapeStrategy {
  readonly kind: StrategyKind
  readonly accepts: (monitor: MonitorConfig) => boolean
  readonly fetch: (request: ScrapeRequest) => Effect.Effect<ScrapeResponse, FetchError>
}
