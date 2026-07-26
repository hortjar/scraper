import { AppConfig } from "@scraper/core/config"
import { RUN_STATUS, SPAN } from "@scraper/core/constants"
import { Database } from "@scraper/db"
import * as schema from "@scraper/db/schema"
import { and, eq, lt } from "drizzle-orm"
import { Clock, Effect } from "effect"

import { STALE_RUN_TIMEOUT_MS } from "../jobs.constants.js"

const DAY_MS = 86_400_000

export const sweepRuns = Effect.fn(SPAN.maintenance.sweepRuns)(function* () {
  const database = yield* Database
  const config = yield* AppConfig
  const now = yield* Clock.currentTimeMillis

  const staleBefore = new Date(now - STALE_RUN_TIMEOUT_MS)

  const reaped = yield* database.query((database_) =>
    database_
      .update(schema.runs)
      .set({ status: RUN_STATUS.failed, errorKind: "reaped_stale", finishedAt: new Date(now) })
      .where(
        and(eq(schema.runs.status, RUN_STATUS.running), lt(schema.runs.startedAt, staleBefore)),
      )
      .returning({ id: schema.runs.id }),
  )

  if (reaped.length > 0) {
    yield* Effect.logInfo("maintenance.sweepRuns.reaped").pipe(
      Effect.annotateLogs({ count: reaped.length }),
    )
  }

  const runCutoff = new Date(now - config.storage.runRetentionDays * DAY_MS)
  const snapshotCutoff = new Date(now - config.storage.snapshotRetentionDays * DAY_MS)

  const deletedChanges = yield* database.query((database_) =>
    database_
      .delete(schema.changes)
      .where(lt(schema.changes.createdAt, runCutoff))
      .returning({ id: schema.changes.id }),
  )

  const deletedFieldValues = yield* database.query((database_) =>
    database_
      .delete(schema.fieldValues)
      .where(lt(schema.fieldValues.createdAt, runCutoff))
      .returning({ id: schema.fieldValues.id }),
  )

  const deletedSnapshots = yield* database.query((database_) =>
    database_
      .delete(schema.snapshots)
      .where(lt(schema.snapshots.createdAt, snapshotCutoff))
      .returning({ id: schema.snapshots.id }),
  )

  const deletedRuns = yield* database.query((database_) =>
    database_
      .delete(schema.runs)
      .where(lt(schema.runs.createdAt, runCutoff))
      .returning({ id: schema.runs.id }),
  )

  yield* Effect.logInfo("maintenance.sweepRuns.pruned").pipe(
    Effect.annotateLogs({
      runs: deletedRuns.length,
      changes: deletedChanges.length,
      fieldValues: deletedFieldValues.length,
      snapshots: deletedSnapshots.length,
    }),
  )
})
