import { AppConfig, SERVICE_TAG } from "@scraper/core"
import { Effect } from "effect"

import { makeBrowserStrategy } from "./browser-strategy.js"

export class BrowserStrategy extends Effect.Service<BrowserStrategy>()(
  SERVICE_TAG.BrowserStrategy,
  {
    effect: Effect.gen(function* () {
      const config = yield* AppConfig
      return makeBrowserStrategy({
        wsEndpoint: config.browser.wsEndpoint,
        token: config.browser.token,
        defaultTimeoutMs: config.browser.timeoutMs,
        blockResources: config.browser.blockResources,
        screenshotsEnabled: config.browser.screenshotsEnabled,
        blockedHostPatterns: config.scraping.blockedHostPatterns,
      })
    }),
    dependencies: [AppConfig.Default],
  },
) {}
