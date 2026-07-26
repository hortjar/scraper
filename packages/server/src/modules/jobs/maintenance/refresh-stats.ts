import { SPAN } from "@scraper/core/constants"
import { Database } from "@scraper/db"
import { sql } from "drizzle-orm"
import { Effect } from "effect"

export const refreshStats = Effect.fn(SPAN.maintenance.refreshStats)(function* () {
  const database = yield* Database

  yield* database.query((database_) =>
    database_.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY monitor_stats`),
  )

  yield* Effect.logInfo("maintenance.refreshStats.completed")
})
