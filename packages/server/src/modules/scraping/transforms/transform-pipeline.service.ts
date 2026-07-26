import { SERVICE_TAG, SPAN, type ExtractorKey, type Transform } from "@scraper/core"
import { Effect } from "effect"

import { runTransforms } from "./transform-pipeline.js"

export class TransformPipeline extends Effect.Service<TransformPipeline>()(
  SERVICE_TAG.TransformPipeline,
  {
    sync: () => {
      const run = Effect.fn(SPAN.scraping.transform)(function* (
        extractorKey: ExtractorKey,
        raw: string | null,
        steps: readonly Transform[],
      ) {
        return yield* runTransforms(extractorKey, raw, steps)
      })

      return { run } as const
    },
  },
) {}
