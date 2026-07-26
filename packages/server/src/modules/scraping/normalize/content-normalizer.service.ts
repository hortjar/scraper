import { SERVICE_TAG, SPAN, type IgnoreRule } from "@scraper/core"
import { Effect } from "effect"

import { normalizeContent } from "./content-normalizer.js"

export class ContentNormalizer extends Effect.Service<ContentNormalizer>()(
  SERVICE_TAG.ContentNormalizer,
  {
    sync: () => {
      const normalize = Effect.fn(SPAN.scraping.normalize)(
        (html: string, contentSelector: string | null, ignoreRules: readonly IgnoreRule[]) =>
          Effect.sync(() => normalizeContent(html, contentSelector, ignoreRules)),
      )

      return { normalize } as const
    },
  },
) {}
