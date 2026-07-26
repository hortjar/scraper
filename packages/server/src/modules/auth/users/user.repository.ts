import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { Email, PlanLimits, UserId, UserRole } from "@scraper/core/domain"
import { User } from "@scraper/core/domain"
import { Database } from "@scraper/db"
import { constraintFailure, decodeRow } from "@scraper/db/repository"
import { users } from "@scraper/db/schema"
import { Effect, Schema } from "effect"

import { runSql } from "../auth.database.js"

export const UserRecord = Schema.Struct({
  ...User.fields,
  passwordHash: Schema.String,
})
export type UserRecord = typeof UserRecord.Type

export interface NewUser {
  readonly id?: string
  readonly email: Email
  readonly passwordHash: string
  readonly displayName: string | null
  readonly timezone: string
  readonly locale: string
  readonly role: UserRole
  readonly planLimits: PlanLimits
}

export interface ProfilePatch {
  readonly displayName?: string | null | undefined
  readonly timezone?: string | undefined
  readonly locale?: string | undefined
}

const ENTITY = "user"

const decodeUser = decodeRow(UserRecord, ENTITY)

const decodeOptionalUser = (row: unknown) =>
  row === undefined || row === null ? Effect.succeed(null) : decodeUser(row)

export class UserRepository extends Effect.Service<UserRepository>()(SERVICE_TAG.UserRepository, {
  effect: Effect.gen(function* () {
    const database = yield* Database

    const findById = Effect.fn(SPAN.auth.findUser)(function* (id: UserId) {
      const row = yield* database.query((executor) =>
        executor.query.users.findFirst({ where: (table, { eq }) => eq(table.id, id) }),
      )
      return yield* decodeOptionalUser(row)
    })

    const findByEmail = Effect.fn(SPAN.auth.findUser)(function* (email: Email) {
      const row = yield* database.query((executor) =>
        executor.query.users.findFirst({ where: (table, { eq }) => eq(table.email, email) }),
      )
      return yield* decodeOptionalUser(row)
    })

    const insert = Effect.fn(SPAN.auth.register)(function* (input: NewUser) {
      const rows = yield* database
        .query((executor) =>
          executor
            .insert(users)
            .values({
              ...(input.id !== undefined && { id: input.id }),
              email: input.email,
              passwordHash: input.passwordHash,
              displayName: input.displayName,
              timezone: input.timezone,
              locale: input.locale,
              role: input.role,
              planLimits: input.planLimits,
            })
            .returning(),
        )
        .pipe(Effect.mapError((error) => constraintFailure(error, ENTITY)))
      return yield* decodeUser(rows[0])
    })

    const updateProfile = Effect.fn(SPAN.auth.updateProfile)(function* (
      id: UserId,
      patch: ProfilePatch,
      now: Date,
    ) {
      yield* runSql(
        database,
        SPAN.auth.updateProfile,
        (client) => client`
          update users
             set display_name = coalesce(${patch.displayName ?? null}, display_name),
                 timezone = coalesce(${patch.timezone ?? null}, timezone),
                 locale = coalesce(${patch.locale ?? null}, locale),
                 updated_at = ${now}
           where id = ${id}
        `,
      )
      return yield* findById(id)
    })

    const updatePasswordHash = Effect.fn(SPAN.auth.changePassword)(function* (
      id: UserId,
      passwordHash: string,
      now: Date,
    ) {
      yield* runSql(
        database,
        SPAN.auth.changePassword,
        (client) => client`
          update users
             set password_hash = ${passwordHash}, updated_at = ${now}
           where id = ${id}
        `,
      )
    })

    const markEmailVerified = Effect.fn(SPAN.auth.verifyEmail)(function* (id: UserId, now: Date) {
      yield* runSql(
        database,
        SPAN.auth.verifyEmail,
        (client) => client`
          update users
             set email_verified_at = ${now}, updated_at = ${now}
           where id = ${id}
        `,
      )
    })

    return {
      findById,
      findByEmail,
      insert,
      updateProfile,
      updatePasswordHash,
      markEmailVerified,
    } as const
  }),
  dependencies: [Database.Default],
}) {}
