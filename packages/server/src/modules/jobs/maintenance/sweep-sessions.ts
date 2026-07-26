import { SPAN } from "@scraper/core/constants"
import { Database } from "@scraper/db"
import * as schema from "@scraper/db/schema"
import { isNotNull, lt, or } from "drizzle-orm"
import { Clock, Effect } from "effect"

export const sweepSessions = Effect.fn(SPAN.maintenance.sweepSessions)(function* () {
  const database = yield* Database
  const now = yield* Clock.currentTimeMillis
  const nowDate = new Date(now)

  const deletedSessions = yield* database.query((database_) =>
    database_
      .delete(schema.sessions)
      .where(lt(schema.sessions.expiresAt, nowDate))
      .returning({ id: schema.sessions.id }),
  )

  const deletedTokens = yield* database.query((database_) =>
    database_
      .delete(schema.verificationTokens)
      .where(
        or(
          lt(schema.verificationTokens.expiresAt, nowDate),
          isNotNull(schema.verificationTokens.consumedAt),
        ),
      )
      .returning({ id: schema.verificationTokens.id }),
  )

  yield* Effect.logInfo("maintenance.sweepSessions.pruned").pipe(
    Effect.annotateLogs({ sessions: deletedSessions.length, tokens: deletedTokens.length }),
  )
})
