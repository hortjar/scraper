import { SERVICE_TAG, SPAN, STRATEGY, type StrategyKind } from "@scraper/core"
import { Effect } from "effect"

import { BrowserStrategy } from "./browser-strategy.service.js"
import { HttpStrategy } from "./http-strategy.service.js"
import { resolveStrategy, type EngineSelector } from "./strategy-registry.js"
import type { ScrapeStrategy } from "./strategy.types.js"

export class StrategyRegistry extends Effect.Service<StrategyRegistry>()(
  SERVICE_TAG.StrategyRegistry,
  {
    effect: Effect.gen(function* () {
      const http: ScrapeStrategy = yield* HttpStrategy
      const browser: ScrapeStrategy = yield* BrowserStrategy

      const byKind = (kind: StrategyKind): ScrapeStrategy =>
        kind === STRATEGY.http ? http : browser

      const resolve = Effect.fn(SPAN.scraping.resolveStrategy)((monitor: EngineSelector) =>
        Effect.succeed(resolveStrategy(monitor, { http, browser })),
      )

      return { resolve, byKind, http, browser } as const
    }),
    dependencies: [HttpStrategy.Default, BrowserStrategy.Default],
  },
) {}
