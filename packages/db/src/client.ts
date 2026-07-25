import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { DbError } from "@scraper/core/errors"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { type Cause, Effect, Exit, FiberRef, Layer, Redacted, Runtime } from "effect"
import postgres from "postgres"

import * as schema from "./schema/index.js"

export type Db = PostgresJsDatabase<typeof schema>
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0]
export type DbExecutor = Db | DbTransaction

export const currentTransaction = FiberRef.unsafeMake<DbTransaction | null>(null)

class TransactionAborted<E> extends Error {
  constructor(readonly failure: Cause.Cause<E>) {
    super("transaction aborted")
  }
}

const openPool = Effect.gen(function* () {
  const config = yield* AppConfig

  const sql = yield* Effect.acquireRelease(
    Effect.sync(() =>
      postgres(Redacted.value(config.database.url), {
        max: config.database.poolMax,
        idle_timeout: config.database.poolIdleTimeout,
        ssl: config.database.ssl ? "require" : false,
        onnotice: () => undefined,
      }),
    ),
    (client) => Effect.promise(() => client.end({ timeout: 5 })),
  )

  return { sql, db: drizzle(sql, { schema }) }
})

export class Database extends Effect.Service<Database>()(SERVICE_TAG.Database, {
  scoped: Effect.gen(function* () {
    const { sql, db } = yield* openPool

    const query = <A>(run: (executor: DbExecutor) => Promise<A>) =>
      FiberRef.get(currentTransaction).pipe(
        Effect.flatMap((active) =>
          Effect.tryPromise({
            try: () => run(active ?? db),
            catch: (cause) => new DbError({ operation: SPAN.db.query, cause }),
          }),
        ),
        Effect.withSpan(SPAN.db.query),
      )

    const runInTransaction = <A, E, R>(
      body: Effect.Effect<A, E, R>,
    ): Effect.Effect<A, E | DbError, R> =>
      Effect.runtime<R>().pipe(
        Effect.flatMap((runtime) => {
          const run = Runtime.runPromiseExit(runtime)
          return Effect.tryPromise<A, TransactionAborted<E> | DbError>({
            try: () =>
              db.transaction(async (tx) => {
                const exit = await run(
                  Effect.locally(body, currentTransaction, tx),
                )
                if (Exit.isFailure(exit)) throw new TransactionAborted(exit.cause)
                return exit.value
              }),
            catch: (cause) =>
              cause instanceof TransactionAborted
                ? (cause as TransactionAborted<E>)
                : new DbError({ operation: SPAN.db.transaction, cause }),
          })
        }),
        Effect.catchAll(
          (error): Effect.Effect<never, E | DbError> =>
            error instanceof TransactionAborted
              ? Effect.failCause(error.failure)
              : Effect.fail(error),
        ),
      )

    const transaction = <A, E, R>(
      body: Effect.Effect<A, E, R>,
    ): Effect.Effect<A, E | DbError, R> =>
      FiberRef.get(currentTransaction).pipe(
        Effect.flatMap((active): Effect.Effect<A, E | DbError, R> =>
          active ? body : runInTransaction(body),
        ),
        Effect.withSpan(SPAN.db.transaction),
      )

    const health = Effect.tryPromise({
      try: () => sql`select 1`.then(() => true as const),
      catch: (cause) => new DbError({ operation: "health", cause }),
    })

    return { query, transaction, health, client: sql } as const
  }),
  dependencies: [AppConfig.Default],
}) {}

export const DatabaseLive = Database.Default

export const databaseFrom = (db: Db): Layer.Layer<Database> =>
  Layer.succeed(
    Database,
    Database.make({
      query: <A>(run: (executor: DbExecutor) => Promise<A>) =>
        Effect.tryPromise({
          try: () => run(db),
          catch: (cause) => new DbError({ operation: SPAN.db.query, cause }),
        }),
      transaction: <A, E, R>(body: Effect.Effect<A, E, R>) =>
        body as Effect.Effect<A, E | DbError, R>,
      health: Effect.succeed(true as const),
      client: undefined as never,
    }),
  )
