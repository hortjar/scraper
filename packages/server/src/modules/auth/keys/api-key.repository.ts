import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { ApiKeyId, ApiKeyScope, UserId } from "@scraper/core/domain"
import { ApiKey } from "@scraper/core/domain"
import { Database } from "@scraper/db"
import { constraintFailure, decodeRow, decodeRows } from "@scraper/db/repository"
import { apiKeys } from "@scraper/db/schema"
import { Effect } from "effect"

import { runSql } from "../auth.database.js"

export interface NewApiKey {
  readonly userId: UserId
  readonly name: string
  readonly prefix: string
  readonly keyHash: Buffer
  readonly scopes: readonly ApiKeyScope[]
  readonly expiresAt: Date | null
}

const ENTITY = "api_key"

const decodeApiKey = decodeRow(ApiKey, ENTITY)
const decodeApiKeys = decodeRows(ApiKey, ENTITY)

export class ApiKeyRepository extends Effect.Service<ApiKeyRepository>()(
  SERVICE_TAG.ApiKeyRepository,
  {
    effect: Effect.gen(function* () {
      const database = yield* Database

      const insert = Effect.fn(SPAN.auth.createApiKey)(function* (input: NewApiKey) {
        const rows = yield* database
          .query((executor) =>
            executor
              .insert(apiKeys)
              .values({
                userId: input.userId,
                name: input.name,
                prefix: input.prefix,
                keyHash: input.keyHash,
                scopes: [...input.scopes],
                expiresAt: input.expiresAt,
              })
              .returning(),
          )
          .pipe(Effect.mapError((error) => constraintFailure(error, ENTITY)))
        return yield* decodeApiKey(rows[0])
      })

      const findByHash = Effect.fn(SPAN.auth.verifyApiKey)(function* (keyHash: Buffer) {
        const row = yield* database.query((executor) =>
          executor.query.apiKeys.findFirst({
            where: (table, { eq }) => eq(table.keyHash, keyHash),
          }),
        )
        return row === undefined ? null : yield* decodeApiKey(row)
      })

      const listActive = Effect.fn(SPAN.auth.listApiKeys)(function* (userId: UserId) {
        const rows = yield* database.query((executor) =>
          executor.query.apiKeys.findMany({
            where: (table, { and, eq, isNull }) =>
              and(eq(table.userId, userId), isNull(table.revokedAt)),
            orderBy: (table, { desc }) => desc(table.createdAt),
          }),
        )
        return yield* decodeApiKeys(rows)
      })

      const revoke = Effect.fn(SPAN.auth.revokeApiKey)(function* (
        userId: UserId,
        id: ApiKeyId,
        now: Date,
      ) {
        const rows = yield* runSql(
          database,
          SPAN.auth.revokeApiKey,
          (client) => client<{ id: string }[]>`
            update api_keys
               set revoked_at = ${now}, updated_at = ${now}
             where id = ${id} and user_id = ${userId} and revoked_at is null
            returning id
          `,
        )
        return rows.length > 0
      })

      const touchLastUsed = Effect.fn(SPAN.auth.verifyApiKey)(function* (id: ApiKeyId, now: Date) {
        yield* runSql(
          database,
          SPAN.auth.verifyApiKey,
          (client) => client`update api_keys set last_used_at = ${now} where id = ${id}`,
        )
      })

      return { insert, findByHash, listActive, revoke, touchLastUsed } as const
    }),
    dependencies: [Database.Default],
  },
) {}
