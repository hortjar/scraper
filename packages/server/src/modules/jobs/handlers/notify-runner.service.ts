import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { AppError } from "@scraper/core/errors"
import { Effect } from "effect"

import type { NotifyJobPayload } from "../jobs.schema.js"

export interface NotifyRunnerShape {
  readonly execute: (payload: NotifyJobPayload) => Effect.Effect<void, AppError>
}

export class NotifyRunner extends Effect.Service<NotifyRunner>()(SERVICE_TAG.NotifyRunner, {
  effect: Effect.succeed<NotifyRunnerShape>({
    execute: (payload) =>
      Effect.logInfo("job.notify.stub").pipe(
        Effect.annotateLogs({ deliveryId: payload.deliveryId }),
        Effect.withSpan(SPAN.notifications.dispatch),
      ),
  }),
}) {}

export const NotifyRunnerLive = NotifyRunner.Default
