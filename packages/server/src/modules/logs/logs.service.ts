import { SERVICE_TAG, SPAN, USER_ROLE } from "@scraper/core/constants"
import type { LogLevelName } from "@scraper/core/constants"
import type { UserRole } from "@scraper/core/domain"
import { NotAuthorized } from "@scraper/core/errors"
import { Effect } from "effect"

import { LOG_ACTION, LOG_TAIL_LIMIT, LOG_TAIL_MAX } from "./logs.constants.js"
import { LogRepository, LogRepositoryLive } from "./logs.repository.js"

export interface LogListQuery {
  readonly level?: string | undefined
  readonly service?: string | undefined
  readonly limit?: string | undefined
  readonly persisted?: string | undefined
}

const TRUE_VALUE = "true"

const toLimit = (raw: string | undefined): number => {
  const parsed = raw === undefined ? NaN : Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return LOG_TAIL_LIMIT
  return Math.min(Math.trunc(parsed), LOG_TAIL_MAX)
}

export class Logs extends Effect.Service<Logs>()(SERVICE_TAG.Logs, {
  effect: Effect.gen(function* () {
    const repository = yield* LogRepository

    const list = Effect.fn(SPAN.logs.tail)(function* (role: UserRole, query: LogListQuery) {
      if (role !== USER_ROLE.admin) {
        return yield* new NotAuthorized({ action: LOG_ACTION.list })
      }

      const filter = {
        level: query.level as LogLevelName | undefined,
        service: query.service,
        limit: toLimit(query.limit),
      }

      if (query.persisted === TRUE_VALUE) {
        const rows = yield* repository.persisted(filter)
        return {
          source: "persisted" as const,
          items: rows.map((row) => ({
            at: row.at.toISOString(),
            level: row.level,
            service: row.service,
            message: row.message,
            annotations: row.annotations,
          })),
        }
      }

      const items = yield* repository.tail(filter)
      return { source: "stream" as const, items }
    })

    return { list } as const
  }),
  dependencies: [LogRepositoryLive],
}) {}

export const LogsLive = Logs.Default
