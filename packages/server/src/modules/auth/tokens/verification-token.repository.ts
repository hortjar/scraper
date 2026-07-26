import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { TokenId, UserId } from "@scraper/core/domain"
import { Database } from "@scraper/db"
import { constraintFailure, decodeRow } from "@scraper/db/repository"
import { verificationTokens } from "@scraper/db/schema"
import { Effect, Schema } from "effect"

import { runSql, sqlTimestamp } from "../auth.database.js"

export const VerificationTokenRecord = Schema.Struct({
  id: TokenId,
  userId: UserId,
  purpose: Schema.String,
  expiresAt: Schema.DateFromSelf,
  consumedAt: Schema.NullOr(Schema.DateFromSelf),
  attempts: Schema.Number,
  createdAt: Schema.DateFromSelf,
})
export type VerificationTokenRecord = typeof VerificationTokenRecord.Type

export type TokenPurpose = "email_verify" | "password_reset" | "channel_verify"

export interface NewVerificationToken {
  readonly userId: UserId
  readonly purpose: TokenPurpose
  readonly tokenHash: Buffer
  readonly expiresAt: Date
}

const ENTITY = "verification_token"

const decodeToken = decodeRow(VerificationTokenRecord, ENTITY)

export class VerificationTokenRepository extends Effect.Service<VerificationTokenRepository>()(
  SERVICE_TAG.VerificationTokenRepository,
  {
    effect: Effect.gen(function* () {
      const database = yield* Database

      const insert = Effect.fn(SPAN.auth.issueToken)(function* (input: NewVerificationToken) {
        const rows = yield* database
          .query((executor) =>
            executor
              .insert(verificationTokens)
              .values({
                userId: input.userId,
                purpose: input.purpose,
                tokenHash: input.tokenHash,
                expiresAt: input.expiresAt,
              })
              .returning(),
          )
          .pipe(Effect.mapError((error) => constraintFailure(error, ENTITY)))
        return yield* decodeToken(rows[0])
      })

      const findByHash = Effect.fn(SPAN.auth.consumeToken)(function* (tokenHash: Buffer) {
        const row = yield* database.query((executor) =>
          executor.query.verificationTokens.findFirst({
            where: (table, { eq }) => eq(table.tokenHash, tokenHash),
          }),
        )
        return row === undefined ? null : yield* decodeToken(row)
      })

      const consume = Effect.fn(SPAN.auth.consumeToken)(function* (id: TokenId, now: Date) {
        const rows = yield* runSql(
          database,
          SPAN.auth.consumeToken,
          (client) => client<{ id: string }[]>`
            update verification_tokens
               set consumed_at = ${sqlTimestamp(now)}
             where id = ${id} and consumed_at is null
            returning id
          `,
        )
        return rows.length > 0
      })

      const consumeOutstanding = Effect.fn(SPAN.auth.issueToken)(function* (
        userId: UserId,
        purpose: TokenPurpose,
        now: Date,
      ) {
        yield* runSql(
          database,
          SPAN.auth.issueToken,
          (client) => client`
            update verification_tokens
               set consumed_at = ${sqlTimestamp(now)}
             where user_id = ${userId} and purpose = ${purpose} and consumed_at is null
          `,
        )
      })

      return { insert, findByHash, consume, consumeOutstanding } as const
    }),
    dependencies: [Database.Default],
  },
) {}
