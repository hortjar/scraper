import { SPAN, type MonitorConfig, type PreviewResult } from "@scraper/core"
import { Clock, Effect } from "effect"

import { parseFragment } from "../dom.types.js"
import { scrapeAndExtract } from "../scrape-and-extract.js"
import { PREVIEW_NORMALIZED_MAX_CHARS, TITLE_SELECTOR } from "../scraping.constants.js"

const extractTitle = (html: string): string | null => {
  const { document } = parseFragment(html)
  const title = document.querySelector(TITLE_SELECTOR)?.textContent ?? null
  if (title === null) return null
  const trimmed = title.trim()
  return trimmed === "" ? null : trimmed
}

export const previewScrape = Effect.fn(SPAN.scraping.preview)(function* (monitor: MonitorConfig) {
  const startedAtMs = yield* Clock.currentTimeMillis
  const outcome = yield* scrapeAndExtract(monitor)
  const durationMs = (yield* Clock.currentTimeMillis) - startedAtMs

  return {
    finalUrl: outcome.response.finalUrl,
    httpStatus: outcome.response.httpStatus,
    strategyUsed: outcome.strategyUsed,
    title: extractTitle(outcome.response.html),
    durationMs,
    fields: outcome.fields,
    normalizedPreview: outcome.normalized.slice(0, PREVIEW_NORMALIZED_MAX_CHARS),
    screenshotRef: null,
    warnings: outcome.warnings,
  } satisfies PreviewResult
})
