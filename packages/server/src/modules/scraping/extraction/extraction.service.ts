import { SERVICE_TAG, SPAN } from "@scraper/core"
import { Effect } from "effect"

import { scopeDocument, selectRaw, type ExtractorSpec } from "./extraction.js"

export class Extraction extends Effect.Service<Extraction>()(SERVICE_TAG.Extraction, {
  sync: () => {
    const extractAll = Effect.fn(SPAN.scraping.extract)(function* (
      html: string,
      contentSelector: string | null,
      extractors: readonly ExtractorSpec[],
    ) {
      const scoped = scopeDocument(html, contentSelector)
      return yield* Effect.forEach(extractors, (extractor) => selectRaw(scoped, html, extractor))
    })

    return { extractAll } as const
  },
}) {}
