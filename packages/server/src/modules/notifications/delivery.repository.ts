import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { NotificationDelivery } from "@scraper/core/domain"
import type { ChangeId, ChannelId, MonitorId, RuleId, UserId } from "@scraper/core/domain"
import type { DatabaseError } from "@scraper/core/errors"
import { DatabaseError as DatabaseErrorClass } from "@scraper/core/errors"
import { Database, decodeRow } from "@scraper/db"
import { Effect } from "effect"

import { timestampParameter, withDeliveryDates } from "./delivery.repository.rows.js"

const decodeDelivery = decodeRow(NotificationDelivery, "notification_delivery")

const SELECT_COLUMNS = `
  id, rule_id AS "ruleId", channel_id AS "channelId", monitor_id AS "monitorId",
  change_ids AS "changeIds", status, suppressed_reason AS "suppressedReason",
  attempts, last_error AS "lastError", provider_message_id AS "providerMessageId",
  sent_at AS "sentAt", created_at AS "createdAt"
`

const JOINED_COLUMNS = `
  d.id, d.rule_id AS "ruleId", d.channel_id AS "channelId", d.monitor_id AS "monitorId",
  d.change_ids AS "changeIds", d.status, d.suppressed_reason AS "suppressedReason",
  d.attempts, d.last_error AS "lastError", d.provider_message_id AS "providerMessageId",
  d.sent_at AS "sentAt", d.created_at AS "createdAt"
`

export interface InsertDeliveryInput {
  readonly ruleId: RuleId
  readonly channelId: ChannelId
  readonly monitorId: MonitorId
  readonly changeIds: readonly ChangeId[]
  readonly status: "pending" | "sent" | "failed" | "suppressed"
  readonly suppressedReason?: NotificationDelivery["suppressedReason"]
  readonly attempts?: number
  readonly lastError?: string | null
  readonly payloadPreview?: Record<string, unknown> | null
  readonly messageHash?: string | null
}

export interface UpdateDeliveryPatch {
  readonly status: "pending" | "sent" | "failed" | "suppressed"
  readonly suppressedReason?: NotificationDelivery["suppressedReason"]
  readonly attempts?: number
  readonly lastError?: string | null
  readonly providerMessageId?: string | null
  readonly sentAt?: Date | null
}

export class DeliveryRepository extends Effect.Service<DeliveryRepository>()(
  SERVICE_TAG.DeliveryRepository,
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

      const insert = Effect.fn(SPAN.deliveryRepository.insert)(function* (
        input: InsertDeliveryInput,
      ) {
        const rows = yield* run(
          `INSERT INTO notification_deliveries
             (rule_id, channel_id, monitor_id, change_ids, status, suppressed_reason, attempts, last_error, payload_preview, message_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
           RETURNING ${SELECT_COLUMNS}`,
          [
            input.ruleId,
            input.channelId,
            input.monitorId,
            input.changeIds,
            input.status,
            input.suppressedReason ?? null,
            input.attempts ?? 0,
            input.lastError ?? null,
            input.payloadPreview ? JSON.stringify(input.payloadPreview) : null,
            input.messageHash ?? null,
          ],
        )
        const row = rows[0]
        if (row === undefined) {
          return yield* Effect.fail(
            new DatabaseErrorClass({ operation: "insert notification_delivery", cause: null }),
          )
        }
        return yield* decodeDelivery(withDeliveryDates(row))
      })

      const updateStatus = Effect.fn(SPAN.deliveryRepository.updateStatus)(function* (
        id: string,
        patch: UpdateDeliveryPatch,
      ) {
        const rows = yield* run(
          `UPDATE notification_deliveries
           SET status = $1,
               suppressed_reason = COALESCE($7::suppression_reason, suppressed_reason),
               attempts = COALESCE($2, attempts),
               last_error = COALESCE($3, last_error),
               provider_message_id = COALESCE($4, provider_message_id),
               sent_at = COALESCE($5::timestamptz, sent_at)
           WHERE id = $6
           RETURNING ${SELECT_COLUMNS}`,
          [
            patch.status,
            patch.attempts ?? null,
            patch.lastError ?? null,
            patch.providerMessageId ?? null,
            timestampParameter(patch.sentAt),
            id,
            patch.suppressedReason ?? null,
          ],
        )
        const row = rows[0]
        if (row === undefined) {
          return yield* Effect.fail(
            new DatabaseErrorClass({ operation: "update notification_delivery", cause: null }),
          )
        }
        return yield* decodeDelivery(withDeliveryDates(row))
      })

      const listByChannel = Effect.fn(SPAN.deliveryRepository.list)(function* (
        userId: UserId,
        channelId: ChannelId,
        limit: number,
      ) {
        const rows = yield* run(
          `SELECT ${JOINED_COLUMNS} FROM notification_deliveries d
           INNER JOIN notification_channels c ON c.id = d.channel_id
           WHERE d.channel_id = $1 AND c.user_id = $2
           ORDER BY d.created_at DESC
           LIMIT $3`,
          [channelId, userId, limit],
        )
        return yield* Effect.forEach(rows, (row) => decodeDelivery(withDeliveryDates(row)))
      })

      const listFiltered = Effect.fn(SPAN.deliveryRepository.listFiltered)(function* (
        userId: UserId,
        filters: {
          readonly ruleId: string | null
          readonly channelId: string | null
          readonly status: string | null
        },
        limit: number,
      ) {
        const rows = yield* run(
          `SELECT ${JOINED_COLUMNS} FROM notification_deliveries d
           INNER JOIN notification_channels c ON c.id = d.channel_id
           WHERE c.user_id = $1
             AND ($2::uuid IS NULL OR d.rule_id = $2::uuid)
             AND ($3::uuid IS NULL OR d.channel_id = $3::uuid)
             AND ($4::text IS NULL OR d.status::text = $4::text)
           ORDER BY d.created_at DESC
           LIMIT $5`,
          [userId, filters.ruleId, filters.channelId, filters.status, limit],
        )
        return yield* Effect.forEach(rows, (row) => decodeDelivery(withDeliveryDates(row)))
      })

      const findById = Effect.fn(SPAN.deliveryRepository.findById)(function* (
        userId: UserId,
        id: string,
      ) {
        const rows = yield* run(
          `SELECT ${JOINED_COLUMNS} FROM notification_deliveries d
           INNER JOIN notification_channels c ON c.id = d.channel_id
           WHERE d.id = $1 AND c.user_id = $2
           LIMIT 1`,
          [id, userId],
        )
        const row = rows[0]
        if (row === undefined) return null
        return yield* decodeDelivery(withDeliveryDates(row))
      })

      return { insert, updateStatus, listByChannel, listFiltered, findById } as const
    }),
    dependencies: [Database.Default],
  },
) {}

export const DeliveryRepositoryLive = DeliveryRepository.Default
