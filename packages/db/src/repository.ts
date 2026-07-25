import { PAGINATION } from "@scraper/core/constants"
import { Conflict, DataCorruption, type DbError } from "@scraper/core/errors"
import { Effect, Schema } from "effect"

export const PG_ERROR = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  checkViolation: "23514",
  notNullViolation: "23502",
} as const

interface PostgresError {
  readonly code?: string
  readonly constraint_name?: string
  readonly table_name?: string
  readonly column_name?: string
}

const asPostgresError = (cause: unknown): PostgresError | null =>
  typeof cause === "object" && cause !== null && "code" in cause
    ? (cause as PostgresError)
    : null

export const constraintFailure = (
  error: DbError,
  resource: string,
): Conflict | DataCorruption | DbError => {
  const pg = asPostgresError(error.cause)
  if (!pg?.code) return error

  switch (pg.code) {
    case PG_ERROR.uniqueViolation:
      return new Conflict({ resource, field: pg.constraint_name ?? "unknown" })
    case PG_ERROR.checkViolation:
    case PG_ERROR.notNullViolation:
      return new DataCorruption({
        entity: resource,
        detail: pg.constraint_name ?? pg.column_name ?? pg.code,
      })
    default:
      return error
  }
}

export const isUniqueViolation = (error: DbError): boolean =>
  asPostgresError(error.cause)?.code === PG_ERROR.uniqueViolation

export const decodeRow = <A, I>(schema: Schema.Schema<A, I>, entity: string) => {
  const decode = Schema.decodeUnknown(schema)
  return (row: unknown): Effect.Effect<A, DataCorruption> =>
    decode(row).pipe(
      Effect.mapError(
        (issue) => new DataCorruption({ entity, detail: issue.message }),
      ),
    )
}

export const decodeRows = <A, I>(schema: Schema.Schema<A, I>, entity: string) => {
  const one = decodeRow(schema, entity)
  return (rows: readonly unknown[]): Effect.Effect<readonly A[], DataCorruption> =>
    Effect.forEach(rows, one)
}

export interface CursorPayload {
  readonly at: string
  readonly id: string
}

export const encodeCursor = (payload: CursorPayload): string =>
  Buffer.from(`${payload.at}|${payload.id}`, "utf8").toString("base64url")

export const decodeCursor = (cursor: string): CursorPayload | null => {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8")
  const separator = decoded.lastIndexOf("|")
  if (separator < 1) return null
  const at = decoded.slice(0, separator)
  const id = decoded.slice(separator + 1)
  if (!at || !id) return null
  return { at, id }
}

export const pageSize = (limit: number | undefined): number =>
  Math.min(Math.max(limit ?? PAGINATION.defaultLimit, 1), PAGINATION.maxLimit)

export const takePage = <A>(
  rows: readonly A[],
  limit: number,
  toCursor: (row: A) => CursorPayload,
): { readonly items: readonly A[]; readonly nextCursor: string | null } => {
  if (rows.length <= limit) return { items: rows, nextCursor: null }
  const items = rows.slice(0, limit)
  const last = items[items.length - 1]
  return {
    items,
    nextCursor: last ? encodeCursor(toCursor(last)) : null,
  }
}
