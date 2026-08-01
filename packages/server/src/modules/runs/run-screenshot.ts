import { LOG_EVENT, LOG_FIELD } from "@scraper/core/constants"
import type { MonitorId, RunId } from "@scraper/core/domain"
import { Effect } from "effect"

import { ArtifactStore, SCREENSHOT_CONTENT_TYPE, screenshotKey } from "../storage/index.js"

export const storeScreenshot = (
  monitorId: MonitorId,
  runId: RunId,
  screenshot: Uint8Array | undefined,
): Effect.Effect<string | null, never, ArtifactStore> => {
  if (screenshot === undefined) return Effect.succeed(null)

  const key = screenshotKey(monitorId, runId)
  const annotations = {
    [LOG_FIELD.monitorId]: monitorId,
    [LOG_FIELD.runId]: runId,
    [LOG_FIELD.screenshotRef]: key,
  }

  return ArtifactStore.pipe(
    Effect.flatMap((store) => store.put(key, screenshot, SCREENSHOT_CONTENT_TYPE)),
    Effect.tap(() =>
      Effect.logDebug(LOG_EVENT.screenshot.stored).pipe(
        Effect.annotateLogs({ ...annotations, [LOG_FIELD.bytes]: screenshot.byteLength }),
      ),
    ),
    Effect.catchAll((error) =>
      Effect.logWarning(LOG_EVENT.screenshot.failed)
        .pipe(Effect.annotateLogs({ ...annotations, [LOG_FIELD.cause]: String(error.cause) }))
        .pipe(Effect.as(null)),
    ),
  )
}
