import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { SessionId, UserId } from "@scraper/core/domain"
import { Session } from "@scraper/core/domain"
import { Database } from "@scraper/db"
import { constraintFailure, decodeRow, decodeRows } from "@scraper/db/repository"
import { sessions } from "@scraper/db/schema"
import { Effect } from "effect"

import { SESSION_LIST_LIMIT } from "../auth.constants.js"
import { runSql } from "../auth.database.js"

export interface NewSession {
  readonly userId: UserId
  readonly tokenHash: Buffer
  readonly expiresAt: Date
  readonly userAgent: string | null
  readonly ip: string | null
}

const ENTITY = "session"

const decodeSession = decodeRow(Session, ENTITY)
const decodeSessions = decodeRows(Session, ENTITY)

export class SessionRepository extends Effect.Service<SessionRepository>()(
  SERVICE_TAG.SessionRepository,
  {
    effect: Effect.gen(function* () {
      const database = yield* Database

      const insert = Effect.fn(SPAN.auth.createSession)(function* (input: NewSession) {
        const rows = yield* database
          .query((executor) =>
            executor
              .insert(sessions)
              .values({
                userId: input.userId,
                tokenHash: input.tokenHash,
                expiresAt: input.expiresAt,
                userAgent: input.userAgent,
                ip: input.ip,
              })
              .returning(),
          )
          .pipe(Effect.mapError((error) => constraintFailure(error, ENTITY)))
        return yield* decodeSession(rows[0])
      })

      const findByTokenHash = Effect.fn(SPAN.auth.authenticate)(function* (tokenHash: Buffer) {
        const row = yield* database.query((executor) =>
          executor.query.sessions.findFirst({
            where: (table, { eq }) => eq(table.tokenHash, tokenHash),
          }),
        )
        return row === undefined ? null : yield* decodeSession(row)
      })

      const touch = Effect.fn(SPAN.auth.touchSession)(function* (
        id: SessionId,
        lastSeenAt: Date,
        expiresAt: Date,
      ) {
        yield* runSql(
          database,
          SPAN.auth.touchSession,
          (client) => client`
            update sessions
               set last_seen_at = ${lastSeenAt}, expires_at = ${expiresAt}
             where id = ${id}
          `,
        )
      })

      const revoke = Effect.fn(SPAN.auth.revokeSession)(function* (
        userId: UserId,
        id: SessionId,
        now: Date,
      ) {
        const rows = yield* runSql(
          database,
          SPAN.auth.revokeSession,
          (client) => client<{ id: string }[]>`
            update sessions
               set revoked_at = ${now}
             where id = ${id} and user_id = ${userId} and revoked_at is null
            returning id
          `,
        )
        return rows.length > 0
      })

      const revokeAll = Effect.fn(SPAN.auth.revokeAllSessions)(function* (
        userId: UserId,
        now: Date,
        except: SessionId | null,
      ) {
        const rows = yield* runSql(
          database,
          SPAN.auth.revokeAllSessions,
          (client) => client<{ id: string }[]>`
            update sessions
               set revoked_at = ${now}
             where user_id = ${userId}
               and revoked_at is null
               and (${except}::uuid is null or id <> ${except}::uuid)
            returning id
          `,
        )
        return rows.length
      })

      const listActive = Effect.fn(SPAN.auth.listSessions)(function* (userId: UserId, now: Date) {
        const rows = yield* database.query((executor) =>
          executor.query.sessions.findMany({
            where: (table, { and, eq, gt, isNull }) =>
              and(eq(table.userId, userId), isNull(table.revokedAt), gt(table.expiresAt, now)),
            orderBy: (table, { desc }) => desc(table.lastSeenAt),
            limit: SESSION_LIST_LIMIT,
          }),
        )
        return yield* decodeSessions(rows)
      })

      return { insert, findByTokenHash, touch, revoke, revokeAll, listActive } as const
    }),
    dependencies: [Database.Default],
  },
) {}
