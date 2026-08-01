import { LOG_FIELD, SPAN } from "@scraper/core/constants"
import { Effect } from "effect"

import { isPersisted } from "./log-record.js"
import { LogRepository } from "./logs.repository.js"

export const drainLogs = Effect.fn(SPAN.logs.drain)(function* () {
  const repository = yield* LogRepository
  const batch = yield* repository.drainBatch()

  if (batch.drained === 0) return

  const persisted = (batch.records ?? []).filter((record) => isPersisted(record))
  yield* repository.insert(persisted)
  yield* repository.advanceCursor(batch.cursor)

  yield* Effect.logDebug("maintenance.drainLogs.completed").pipe(
    Effect.annotateLogs({
      [LOG_FIELD.drained]: batch.drained,
      [LOG_FIELD.persisted]: persisted.length,
    }),
  )
})
