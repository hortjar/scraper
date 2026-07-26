# @scraper/db

Postgres schema, migrations, and the `Database` service. Depends only on
`@scraper/core`. It must never import a feature module.

## Layout

```
src/schema/     one file per feature area, barrel-exported
  columns.ts    shared column builders (primaryId, citext, bytea, timestamps)
  enums.ts      every pgEnum, built FROM @scraper/core constants
src/client.ts   the Database service: query, transaction, health
src/migrator.ts boot-time migration runner: applies migrations/*.sql, advisory-locked
src/repository.ts  decode helpers, constraint mapping, cursor pagination
migrations/     SQL, authored by drizzle-kit, applied by src/migrator.ts at boot
```

## Enums come from constants

`enums.ts` builds every `pgEnum` from the constant objects in
`@scraper/core/constants`:

```ts
export const monitorStatusEnum = pgEnum("monitor_status", values(MONITOR_STATUS))
```

The database enum and the TypeScript union therefore cannot drift. Adding a status
means editing one constant; the migration follows from it.

`notification_channels.kind` is deliberately **`text`, not an enum** — adding a
notification channel must not require a migration.

## The transaction contract

`Database.transaction` propagates the active transaction through a `FiberRef`, so
any repository call inside the callback joins it automatically without threading a
handle through every signature:

```ts
yield *
  db.transaction(
    Effect.gen(function* () {
      const monitor = yield* monitorRepository.insert(input)
      yield* extractorRepository.insertMany(monitor.id, fields)
    }),
  )
```

Nested `transaction` calls are a no-op — the outermost one owns the boundary.

Getting typed errors out through Drizzle's promise-based callback needs care: the
body runs via `Runtime.runPromiseExit`, and a failure is rethrown as an internal
`TransactionAborted` carrying the `Cause`, which rolls the transaction back and is
then re-raised with `Effect.failCause`. Without that round trip, a typed failure
would either be swallowed into a defect or would commit the transaction. Do not
"simplify" it back to `runPromise`.

## Repository conventions

- Repositories return **domain types**, never Drizzle rows. `decodeRow` runs the
  Effect Schema decode and turns a mismatch into `DataCorruption`.
- `constraintFailure(error, resource)` maps Postgres codes to tagged errors:
  `23505` → `Conflict`, `23514`/`23502` → `DataCorruption`.
- Cursor pagination is `(created_at, id)` encoded base64url by `encodeCursor`.
  Offsets are never used — run lists grow without bound and offsets drift under
  concurrent inserts.
- Every query filters `user_id` at the SQL level. Ownership is never checked after
  loading a row.

## Migrations

```bash
pnpm db:generate    # drizzle-kit diff against the schema
pnpm db:migrate     # apply, via drizzle-kit — for local/manual use
pnpm db:reset       # drop and recreate the public schema (refuses in production)
pnpm db:seed        # dev user plus three demo monitors
```

`0000_init` is generated, then hand-edited to prepend `CREATE EXTENSION` for
`citext` and `pgcrypto` — drizzle-kit does not emit extensions.

`0001_monitor_stats` is hand-written: drizzle-kit does not model materialized
views. It is registered in `meta/_journal.json` manually. Because drizzle-kit does
not track matviews, `generate` will not try to drop it.

Migrations are **additive and backward compatible within a release** — expand,
deploy, backfill, contract later. That is what makes a rolling restart safe.

### Boot-time migrations (`src/migrator.ts`)

`apps/api/src/main.ts` calls `runMigrations()` before `app.listen`, gated on
`config.database.runMigrationsOnBoot` (`RUN_MIGRATIONS_ON_BOOT`, default `true`).
This is the path that actually provisions a fresh deployment — `pnpm db:migrate`
above is for local/manual use only.

The runner does **not** shell out to `drizzle-kit`. It:

1. **Reserves a single pooled connection** (`sql.reserve()`) to hold the lock, and
   releases it in every path via `Effect.acquireUseRelease`. The migrations
   themselves run on the pool, **not** on the reserved connection — a `ReservedSql`
   has no `.begin()`, so transactions are unavailable on it. Its only job is to be a
   stable session for lock and unlock.
2. Acquires a Postgres session-level advisory lock (`pg_advisory_lock`) using the
   fixed key `DATABASE_LOCK.migrations` from `@scraper/core/constants`, so that N
   API replicas booting at once serialize instead of racing on DDL. The lock is
   released in every path, including failure, via `Effect.ensuring`.

   **The reservation in step 1 is what makes step 2 correct, and it is not
   optional.** `Database.client` is a _pool_, but advisory locks are scoped to a
   _session_: `pg_advisory_unlock` only works when it runs on the same connection
   that took the lock. Issued against the pool, the lock and the unlock can land on
   different connections — the unlock then returns `false` and does nothing, and the
   lock survives as long as the holding connection stays in the pool, which is the
   life of the process. Every replica that boots afterwards blocks on
   `pg_advisory_lock` forever. A failed unlock is also logged rather than swallowed,
   because the symptom otherwise appears much later and somewhere else.

3. Creates a `schema_migrations(filename text primary key, applied_at timestamptz)`
   tracking table if it does not already exist.
4. Reads `migrations/*.sql`, sorted lexically by filename — hence the zero-padded
   `NNNN_` prefix convention — and applies whichever filenames are not yet in
   `schema_migrations`.
5. Applies each file and records it in the same Postgres transaction
   (`sql.begin`), so a mid-file failure cannot leave a migration half-applied but
   unrecorded — the next boot would then try to re-run `CREATE TYPE`/`CREATE TABLE`
   statements that lack `IF NOT EXISTS` and fail loudly instead of silently drifting.

A migration failure fails the effect with `DatabaseError`; `main.ts` logs
`db.migrate.failed` and calls `process.exit(1)` before the server ever starts
listening, so a broken schema never serves traffic. Pure ordering/idempotency logic
(`sortMigrationFiles`, `selectPendingMigrations`) is covered by
`src/migrator.test.ts` without a live database.

The seed user's `password_hash` is `!`, which no hash verifier accepts. That is on
purpose: register through the API rather than seeding a real credential.

## Deliberate deviations from docs/02-DATA-MODEL.md

Both are recorded in that doc with the reasoning:

1. IDs default to `gen_random_uuid()`; UUIDv7 is generated by the application.
   `uuidv7()` is a Postgres 18 function and we target 17.
2. Table partitioning is deferred. It forces the partition key into every primary
   key and every referencing foreign key, and drizzle-kit cannot express it.

## Adding a table

1. Add it to the right `src/schema/<area>.ts`, using `primaryId()` and `timestamps()`.
2. Enums go in `enums.ts`, built from a constant in `@scraper/core`.
3. `pnpm db:generate`, read the SQL it produced, and apply it with `pnpm db:migrate`.
4. Update `docs/02-DATA-MODEL.md` in the same change.
