import { readdir, readFile } from "node:fs/promises"

import { DATABASE_LOCK, LOG_FIELD, SPAN } from "@scraper/core/constants"
import { DatabaseError } from "@scraper/core/errors"
import { Effect } from "effect"

import { Database } from "./client.js"

type Sql = Database["client"]
type ReservedSql = Awaited<ReturnType<Sql["reserve"]>>

const MIGRATIONS_DIR_URL = new URL("../migrations/", import.meta.url)
const SQL_EXTENSION = ".sql"
const MIGRATIONS_TABLE = "schema_migrations"

const MIGRATION_STEP = {
  reserve: "migrate.reserve",
  lock: "migrate.lock",
  unlock: "migrate.unlock",
  ensureTable: "migrate.ensureTable",
  loadApplied: "migrate.loadApplied",
  listFiles: "migrate.listFiles",
  readFile: "migrate.readFile",
  apply: "migrate.apply",
} as const

export interface MigrationResult {
  readonly applied: readonly string[]
}

export const sortMigrationFiles = (files: readonly string[]): readonly string[] =>
  files.filter((file) => file.endsWith(SQL_EXTENSION)).toSorted((a, b) => a.localeCompare(b))

export const selectPendingMigrations = (
  available: readonly string[],
  applied: ReadonlySet<string>,
): readonly string[] => sortMigrationFiles(available).filter((file) => !applied.has(file))

const databaseFail =
  (operation: string) =>
  (cause: unknown): DatabaseError =>
    new DatabaseError({ operation, cause })

const runQuery = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: databaseFail(operation) })

const acquireLock = (sql: ReservedSql) =>
  runQuery(MIGRATION_STEP.lock, () => sql`select pg_advisory_lock(${DATABASE_LOCK.migrations})`)

const releaseLock = (sql: ReservedSql) =>
  runQuery(
    MIGRATION_STEP.unlock,
    () => sql`select pg_advisory_unlock(${DATABASE_LOCK.migrations})`,
  ).pipe(
    Effect.tapError((error) =>
      Effect.logError("db.migrate.unlockFailed").pipe(
        Effect.annotateLogs({ cause: String(error.cause) }),
      ),
    ),
    Effect.ignore,
  )

const ensureMigrationsTable = (sql: ReservedSql) =>
  runQuery(
    MIGRATION_STEP.ensureTable,
    () => sql`
      create table if not exists ${sql(MIGRATIONS_TABLE)} (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `,
  )

const loadAppliedMigrations = (sql: ReservedSql) =>
  runQuery(
    MIGRATION_STEP.loadApplied,
    () => sql<{ filename: string }[]>`select filename from ${sql(MIGRATIONS_TABLE)}`,
  ).pipe(Effect.map((rows) => new Set(rows.map((row) => row.filename))))

const listMigrationFiles = () =>
  runQuery(MIGRATION_STEP.listFiles, () => readdir(MIGRATIONS_DIR_URL))

const readMigrationFile = (file: string) =>
  runQuery(MIGRATION_STEP.readFile, () => readFile(new URL(file, MIGRATIONS_DIR_URL), "utf8"))

const applyInTransaction = (sql: ReservedSql, file: string, content: string) =>
  sql.begin(async (tx) => {
    await tx.unsafe(content)
    await tx`insert into ${tx(MIGRATIONS_TABLE)} (filename) values (${file})`
  })

const logMigrationApplied = (file: string) =>
  Effect.logInfo("db.migrate.applied").pipe(
    Effect.annotateLogs({ [LOG_FIELD.migrationFile]: file }),
  )

const applyMigration = (sql: ReservedSql, file: string) =>
  readMigrationFile(file).pipe(
    Effect.flatMap((content) =>
      runQuery(MIGRATION_STEP.apply, () => applyInTransaction(sql, file, content)),
    ),
    Effect.zipRight(logMigrationApplied(file)),
  )

const applyPendingMigrations = (sql: ReservedSql) =>
  Effect.gen(function* () {
    yield* ensureMigrationsTable(sql)
    const applied = yield* loadAppliedMigrations(sql)
    const entries = yield* listMigrationFiles()
    const pending = selectPendingMigrations(entries, applied)

    yield* Effect.forEach(pending, (file) => applyMigration(sql, file), { discard: true })

    return { applied: pending }
  })

const underAdvisoryLock = (sql: ReservedSql) => {
  const guarded = applyPendingMigrations(sql).pipe(Effect.ensuring(releaseLock(sql)))
  return acquireLock(sql).pipe(Effect.zipRight(guarded))
}

const releaseConnection = (reserved: ReservedSql) =>
  Effect.sync(() => {
    reserved.release()
  })

export const runMigrations = Effect.fn(SPAN.db.migrate)(function* () {
  const database = yield* Database

  return yield* Effect.acquireUseRelease(
    runQuery(MIGRATION_STEP.reserve, () => database.client.reserve()),
    underAdvisoryLock,
    releaseConnection,
  )
})
