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
const BASELINE_PROBE_TABLE = "public.users"

const MIGRATION_STEP = {
  reserve: "migrate.reserve",
  lock: "migrate.lock",
  unlock: "migrate.unlock",
  ensureTable: "migrate.ensureTable",
  loadApplied: "migrate.loadApplied",
  listFiles: "migrate.listFiles",
  readFile: "migrate.readFile",
  apply: "migrate.apply",
  probeSchema: "migrate.probeSchema",
  baseline: "migrate.baseline",
} as const

export interface MigrationResult {
  readonly applied: readonly string[]
}

export const sortMigrationFiles = (files: readonly string[]): readonly string[] =>
  files.filter((file) => file.endsWith(SQL_EXTENSION)).toSorted((a, b) => a.localeCompare(b))

export const shouldAdoptBaseline = (appliedCount: number, isSchemaPresent: boolean): boolean =>
  appliedCount === 0 && isSchemaPresent

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

const ensureMigrationsTable = (sql: Sql) =>
  runQuery(
    MIGRATION_STEP.ensureTable,
    () => sql`
      create table if not exists ${sql(MIGRATIONS_TABLE)} (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `,
  )

const loadAppliedMigrations = (sql: Sql) =>
  runQuery(
    MIGRATION_STEP.loadApplied,
    () => sql<{ filename: string }[]>`select filename from ${sql(MIGRATIONS_TABLE)}`,
  ).pipe(Effect.map((rows) => new Set(rows.map((row) => row.filename))))

const probeExistingSchema = (sql: Sql) =>
  runQuery(
    MIGRATION_STEP.probeSchema,
    () =>
      sql<
        { present: boolean }[]
      >`select to_regclass(${BASELINE_PROBE_TABLE}) is not null as present`,
  ).pipe(Effect.map((rows) => rows[0]?.present === true))

const recordBaseline = (sql: Sql, files: readonly string[]) =>
  runQuery(
    MIGRATION_STEP.baseline,
    () => sql`insert into ${sql(MIGRATIONS_TABLE)} ${sql(files.map((filename) => ({ filename })))}`,
  )

const listMigrationFiles = () =>
  runQuery(MIGRATION_STEP.listFiles, () => readdir(MIGRATIONS_DIR_URL))

const readMigrationFile = (file: string) =>
  runQuery(MIGRATION_STEP.readFile, () => readFile(new URL(file, MIGRATIONS_DIR_URL), "utf8"))

const applyInTransaction = (sql: Sql, file: string, content: string) =>
  sql.begin(async (tx) => {
    await tx.unsafe(content)
    await tx`insert into ${tx(MIGRATIONS_TABLE)} (filename) values (${file})`
  })

const logMigrationApplied = (file: string) =>
  Effect.logInfo("db.migrate.applied").pipe(
    Effect.annotateLogs({ [LOG_FIELD.migrationFile]: file }),
  )

const applyMigration = (sql: Sql, file: string) =>
  readMigrationFile(file).pipe(
    Effect.flatMap((content) =>
      runQuery(MIGRATION_STEP.apply, () => applyInTransaction(sql, file, content)),
    ),
    Effect.zipRight(logMigrationApplied(file)),
  )

const adoptExistingSchema = (sql: Sql, available: readonly string[]) =>
  Effect.gen(function* () {
    const baseline = sortMigrationFiles(available)
    if (baseline.length > 0) yield* recordBaseline(sql, baseline)
    yield* Effect.logWarning("db.migrate.baseline").pipe(
      Effect.annotateLogs({ [LOG_FIELD.migrationsApplied]: baseline.length }),
    )
    return { applied: [] as readonly string[] }
  })

const applyPendingMigrations = (sql: Sql) =>
  Effect.gen(function* () {
    yield* ensureMigrationsTable(sql)
    const applied = yield* loadAppliedMigrations(sql)
    const entries = yield* listMigrationFiles()

    if (shouldAdoptBaseline(applied.size, yield* probeExistingSchema(sql))) {
      return yield* adoptExistingSchema(sql, entries)
    }

    const pending = selectPendingMigrations(entries, applied)

    yield* Effect.forEach(pending, (file) => applyMigration(sql, file), { discard: true })

    return { applied: pending }
  })

const underAdvisoryLock = (lockConnection: ReservedSql, sql: Sql) => {
  const guarded = applyPendingMigrations(sql).pipe(Effect.ensuring(releaseLock(lockConnection)))
  return acquireLock(lockConnection).pipe(Effect.zipRight(guarded))
}

const releaseConnection = (reserved: ReservedSql) =>
  Effect.sync(() => {
    reserved.release()
  })

export const runMigrations = Effect.fn(SPAN.db.migrate)(function* () {
  const database = yield* Database

  const sql = database.client

  return yield* Effect.acquireUseRelease(
    runQuery(MIGRATION_STEP.reserve, () => sql.reserve()),
    (lockConnection) => underAdvisoryLock(lockConnection, sql),
    releaseConnection,
  )
})
