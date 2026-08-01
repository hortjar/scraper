import { SPAN } from "@scraper/core/constants"
import type { MonitorId, RunId } from "@scraper/core/domain"
import type { Database } from "@scraper/db"
import { schema } from "@scraper/db"
import { eq } from "drizzle-orm"
import { Effect } from "effect"

export const makeSnapshotQueries = (database: Database) => {
  const insertSnapshot = Effect.fn(SPAN.runRepository.insertSnapshot)(function* (
    runId: RunId,
    monitorId: MonitorId,
    content: string,
    screenshotReference: string | null,
  ) {
    yield* database.query((executor) =>
      executor.insert(schema.snapshots).values({
        runId,
        monitorId,
        content,
        screenshotRef: screenshotReference,
        sizeBytes: Buffer.byteLength(content, "utf8"),
      }),
    )
  })

  const latestSnapshot = Effect.fn(SPAN.runRepository.fieldValues)(function* (runId: RunId) {
    const rows = yield* database.query((executor) =>
      executor
        .select({ content: schema.snapshots.content })
        .from(schema.snapshots)
        .where(eq(schema.snapshots.runId, runId))
        .limit(1),
    )
    return rows[0]?.content ?? null
  })

  const screenshotReference = Effect.fn(SPAN.runRepository.insertSnapshot)(function* (
    runId: RunId,
  ) {
    const rows = yield* database.query((executor) =>
      executor
        .select({ screenshotRef: schema.snapshots.screenshotRef })
        .from(schema.snapshots)
        .where(eq(schema.snapshots.runId, runId))
        .limit(1),
    )
    return rows[0]?.screenshotRef ?? null
  })

  return { insertSnapshot, latestSnapshot, screenshotReference } as const
}
