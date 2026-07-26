import { SPAN } from "@scraper/core/constants"
import { DatabaseError } from "@scraper/core/errors"
import type { Database } from "@scraper/db"
import { Effect } from "effect"

export type SqlClient = Database["client"]

export const sqlTimestamp = (value: Date): string => value.toISOString()

export const runSql = <A>(
  database: Database,
  operation: string,
  run: (client: SqlClient) => Promise<A>,
): Effect.Effect<A, DatabaseError> =>
  Effect.tryPromise({
    try: () => run(database.client),
    catch: (cause) => new DatabaseError({ operation, cause }),
  }).pipe(Effect.withSpan(SPAN.db.query))

export const TABLE = {
  users: "users",
  sessions: "sessions",
  apiKeys: "api_keys",
  verificationTokens: "verification_tokens",
} as const

export const COLUMN = {
  id: "id",
  userId: "user_id",
  passwordHash: "password_hash",
  emailVerifiedAt: "email_verified_at",
  displayName: "display_name",
  timezone: "timezone",
  locale: "locale",
  updatedAt: "updated_at",
  revokedAt: "revoked_at",
  lastSeenAt: "last_seen_at",
  lastUsedAt: "last_used_at",
  expiresAt: "expires_at",
  consumedAt: "consumed_at",
  purpose: "purpose",
} as const
