import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { NotificationChannelRecord } from "@scraper/core/domain"
import type { ChannelId, UserId } from "@scraper/core/domain"
import { ChannelNotFound, Conflict, type DatabaseError } from "@scraper/core/errors"
import { Database, constraintFailure, decodeRow } from "@scraper/db"
import { Effect } from "effect"

const decodeChannel = decodeRow(NotificationChannelRecord, "notification_channel")

interface ChannelRow {
  readonly id: string
  readonly userId: string
  readonly kind: string
  readonly name: string
  readonly config: Record<string, unknown>
  readonly secret: Buffer | null
  readonly secretIv: Buffer | null
  readonly secretTag: Buffer | null
  readonly verifiedAt: Date | null
  readonly enabled: boolean
  readonly failureCount: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface EncryptedSecretColumns {
  readonly secret: Buffer
  readonly iv: Buffer
  readonly tag: Buffer
}

export interface ChannelDecryptedConfig {
  readonly config: Record<string, unknown>
  readonly secret: EncryptedSecretColumns | null
}

const SELECT_COLUMNS = `
  id, user_id AS "userId", kind, name, config,
  secret, secret_iv AS "secretIv", secret_tag AS "secretTag",
  verified_at AS "verifiedAt", enabled, failure_count AS "failureCount",
  created_at AS "createdAt", updated_at AS "updatedAt"
`

const withHasSecret = (row: ChannelRow) => ({ ...row, hasSecret: row.secret !== null })

interface ChannelPatch {
  readonly name?: string
  readonly config?: Record<string, unknown>
  readonly enabled?: boolean
  readonly secret?: EncryptedSecretColumns | null
}

type ChannelSecretColumns = Pick<ChannelRow, "secret" | "secretIv" | "secretTag" | "verifiedAt">

const mergeSecretColumns = (
  existing: ChannelSecretColumns,
  secret: EncryptedSecretColumns | null | undefined,
): ChannelSecretColumns => {
  if (secret === undefined) return existing
  return {
    secret: secret?.secret ?? null,
    secretIv: secret?.iv ?? null,
    secretTag: secret?.tag ?? null,
    verifiedAt: null,
  }
}

const mergeChannelPatch = (existing: ChannelRow, patch: ChannelPatch) => ({
  name: patch.name ?? existing.name,
  config: patch.config ?? existing.config,
  enabled: patch.enabled ?? existing.enabled,
  ...mergeSecretColumns(existing, patch.secret),
})

export class ChannelRepository extends Effect.Service<ChannelRepository>()(
  SERVICE_TAG.ChannelRepository,
  {
    effect: Effect.gen(function* () {
      const database = yield* Database
      const sql = database.client

      type SqlParameters = Parameters<typeof sql.unsafe>[1]

      const run = <A>(
        query: string,
        parameters: readonly unknown[],
      ): Effect.Effect<A[], DatabaseError> =>
        database.query(() => sql.unsafe<A[]>(query, parameters as SqlParameters))

      const findRow = (
        userId: UserId,
        id: ChannelId,
      ): Effect.Effect<ChannelRow | null, DatabaseError> =>
        run<ChannelRow>(
          `SELECT ${SELECT_COLUMNS} FROM notification_channels WHERE id = $1 AND user_id = $2 LIMIT 1`,
          [id, userId],
        ).pipe(Effect.map((rows) => rows[0] ?? null))

      const insert = Effect.fn(SPAN.channelRepository.insert)(function* (
        userId: UserId,
        kind: string,
        name: string,
        config: Record<string, unknown>,
        secret: EncryptedSecretColumns | null,
      ) {
        const rows = yield* run<ChannelRow>(
          `INSERT INTO notification_channels (user_id, kind, name, config, secret, secret_iv, secret_tag)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
           RETURNING ${SELECT_COLUMNS}`,
          [
            userId,
            kind,
            name,
            JSON.stringify(config),
            secret?.secret ?? null,
            secret?.iv ?? null,
            secret?.tag ?? null,
          ],
        ).pipe(Effect.mapError((error) => constraintFailure(error, "channel")))
        const row = rows[0]
        if (!row) return yield* Effect.fail(new Conflict({ resource: "channel", field: "name" }))
        return yield* decodeChannel(withHasSecret(row))
      })

      const findById = Effect.fn(SPAN.channelRepository.findById)(function* (
        userId: UserId,
        id: ChannelId,
      ) {
        const row = yield* findRow(userId, id)
        if (!row) return yield* Effect.fail(new ChannelNotFound({ id }))
        return yield* decodeChannel(withHasSecret(row))
      })

      const list = Effect.fn(SPAN.channelRepository.list)(function* (userId: UserId) {
        const rows = yield* run<ChannelRow>(
          `SELECT ${SELECT_COLUMNS} FROM notification_channels WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId],
        )
        return yield* Effect.forEach(rows, (row) => decodeChannel(withHasSecret(row)))
      })

      const update = Effect.fn(SPAN.channelRepository.update)(function* (
        userId: UserId,
        id: ChannelId,
        patch: {
          readonly name?: string
          readonly config?: Record<string, unknown>
          readonly enabled?: boolean
          readonly secret?: EncryptedSecretColumns | null
        },
      ) {
        const existing = yield* findRow(userId, id)
        if (!existing) return yield* Effect.fail(new ChannelNotFound({ id }))

        const next = mergeChannelPatch(existing, patch)

        const rows = yield* run<ChannelRow>(
          `UPDATE notification_channels
           SET name = $1, config = $2::jsonb, enabled = $3, secret = $4, secret_iv = $5, secret_tag = $6, verified_at = $7
           WHERE id = $8 AND user_id = $9
           RETURNING ${SELECT_COLUMNS}`,
          [
            next.name,
            JSON.stringify(next.config),
            next.enabled,
            next.secret,
            next.secretIv,
            next.secretTag,
            next.verifiedAt,
            id,
            userId,
          ],
        ).pipe(Effect.mapError((error) => constraintFailure(error, "channel")))
        const row = rows[0]
        if (!row) return yield* Effect.fail(new ChannelNotFound({ id }))
        return yield* decodeChannel(withHasSecret(row))
      })

      const remove = Effect.fn(SPAN.channelRepository.remove)(function* (
        userId: UserId,
        id: ChannelId,
      ) {
        const rows = yield* run<{ readonly id: string }>(
          `DELETE FROM notification_channels WHERE id = $1 AND user_id = $2 RETURNING id`,
          [id, userId],
        )
        if (rows.length === 0) return yield* Effect.fail(new ChannelNotFound({ id }))
      })

      const markVerified = Effect.fn(SPAN.channelRepository.markVerified)(function* (
        userId: UserId,
        id: ChannelId,
        verifiedAt: Date,
      ) {
        yield* run(
          `UPDATE notification_channels SET verified_at = $1, failure_count = 0 WHERE id = $2 AND user_id = $3`,
          [verifiedAt, id, userId],
        )
      })

      const incrementFailureCount = Effect.fn(SPAN.channelRepository.incrementFailureCount)(
        function* (userId: UserId, id: ChannelId, limit: number) {
          const row = yield* findRow(userId, id)
          if (!row) return
          const nextCount = row.failureCount + 1
          yield* run(
            `UPDATE notification_channels SET failure_count = $1, enabled = $2 WHERE id = $3 AND user_id = $4`,
            [nextCount, nextCount >= limit ? false : row.enabled, id, userId],
          )
        },
      )

      const getSecret = Effect.fn(SPAN.channelRepository.getSecret)(function* (
        userId: UserId,
        id: ChannelId,
      ) {
        const row = yield* findRow(userId, id)
        if (!row) return yield* Effect.fail(new ChannelNotFound({ id }))
        const decrypted: ChannelDecryptedConfig = {
          config: row.config,
          secret:
            row.secret && row.secretIv && row.secretTag
              ? { secret: row.secret, iv: row.secretIv, tag: row.secretTag }
              : null,
        }
        return decrypted
      })

      return {
        insert,
        findById,
        list,
        update,
        remove,
        markVerified,
        incrementFailureCount,
        getSecret,
      } as const
    }),
    dependencies: [Database.Default],
  },
) {}

export const ChannelRepositoryLive = ChannelRepository.Default
