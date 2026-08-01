import { SPAN } from "@scraper/core/constants"
import { Clock, Effect } from "effect"

import type { RunRequest } from "./run-pipeline.js"
import type { RunRepository } from "./runs.repository.js"

export const claimExistingRun = Effect.fn(SPAN.runs.persist)(function* (
  runs: RunRepository,
  request: RunRequest,
) {
  if (request.runId !== undefined) {
    const startedAt = new Date(yield* Clock.currentTimeMillis)
    const claimed = yield* runs.markRunning(request.runId, startedAt, request.jobId)
    if (claimed !== null) return claimed
  }
  return request.jobId === null ? null : yield* runs.findByJobId(request.jobId)
})
