import type { ActorKind, AuditAction } from "@scraper/core/constants"
import { LOG_FIELD, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { UserId } from "@scraper/core/domain"
import { Database } from "@scraper/db"
import { auditLog } from "@scraper/db/schema"
import { Effect } from "effect"

export interface AuditEntry {
  readonly userId: UserId | null
  readonly actorKind: ActorKind
  readonly action: AuditAction
  readonly subjectKind: string | null
  readonly subjectId: string | null
  readonly meta: Readonly<Record<string, unknown>>
  readonly ip: string | null
}

export class AuditLog extends Effect.Service<AuditLog>()(SERVICE_TAG.AuditLog, {
  effect: Effect.gen(function* () {
    const database = yield* Database

    const record = Effect.fn(SPAN.auth.audit)(function* (entry: AuditEntry) {
      yield* database
        .query((executor) =>
          executor
            .insert(auditLog)
            .values({
              userId: entry.userId,
              actorKind: entry.actorKind,
              action: entry.action,
              subjectKind: entry.subjectKind,
              subjectId: entry.subjectId,
              meta: { ...entry.meta },
              ip: entry.ip,
            })
            .returning({ id: auditLog.id }),
        )
        .pipe(
          Effect.catchTag("DatabaseError", (error) =>
            Effect.logError(SPAN.auth.audit).pipe(
              Effect.annotateLogs({
                [LOG_FIELD.errorTag]: error._tag,
                action: entry.action,
              }),
            ),
          ),
        )
    })

    return { record } as const
  }),
  dependencies: [Database.Default],
}) {}
