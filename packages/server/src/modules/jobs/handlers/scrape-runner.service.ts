import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { AppError } from "@scraper/core/errors"
import { Effect } from "effect"

import type { ScrapeJobPayload } from "../jobs.schema.js"

export interface ScrapeRunnerShape {
  readonly execute: (payload: ScrapeJobPayload) => Effect.Effect<void, AppError>
}

export class ScrapeRunner extends Effect.Service<ScrapeRunner>()(SERVICE_TAG.ScrapeRunner, {
  effect: Effect.succeed<ScrapeRunnerShape>({
    execute: (payload) =>
      Effect.logInfo("job.scrape.stub").pipe(
        Effect.annotateLogs({ monitorId: payload.monitorId, trigger: payload.trigger }),
        Effect.withSpan(SPAN.runs.execute),
      ),
  }),
}) {}

export const ScrapeRunnerLive = ScrapeRunner.Default
