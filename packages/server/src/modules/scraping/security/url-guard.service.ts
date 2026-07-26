import { AppConfig, SERVICE_TAG } from "@scraper/core"
import { Effect } from "effect"

import { checkUrl } from "./url-guard.js"

export class UrlGuard extends Effect.Service<UrlGuard>()(SERVICE_TAG.UrlGuard, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const blockedHostPatterns = config.scraping.blockedHostPatterns

    const check = (rawUrl: string) => checkUrl(rawUrl, blockedHostPatterns)

    return { check } as const
  }),
  dependencies: [AppConfig.Default],
}) {}
