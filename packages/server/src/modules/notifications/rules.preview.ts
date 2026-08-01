import { NOTIFICATION_EVENT, SPAN } from "@scraper/core/constants"
import { Change, NotificationMessage } from "@scraper/core/domain"
import type { MonitorId, RuleId } from "@scraper/core/domain"
import { resolveLocale } from "@scraper/core/i18n"
import type { Database } from "@scraper/db"
import { decodeRow, decodeRows, schema, toDomainChange } from "@scraper/db"
import { desc, eq } from "drizzle-orm"
import { Clock, Effect } from "effect"

import { loadLabels, loadRun, summaryFor } from "./delivery-context.js"
import { WEB_PATH } from "./notifications.constants.js"
import { PREVIEW_CHANGE_LIMIT } from "./rules.constants.js"

const decodeChanges = decodeRows(Change, "change")
const decodeMessage = decodeRow(NotificationMessage, "notification_message")

export interface PreviewSubject {
  readonly monitorId: MonitorId
  readonly ruleId: RuleId
  readonly ruleName: string
}

export interface PreviewMessage {
  readonly message: NotificationMessage
  readonly basedOnRunId: string | null
}

const latestChanges = (database: Database, monitorId: string) =>
  database
    .query((executor) =>
      executor
        .select()
        .from(schema.changes)
        .where(eq(schema.changes.monitorId, monitorId))
        .orderBy(desc(schema.changes.createdAt))
        .limit(PREVIEW_CHANGE_LIMIT),
    )
    .pipe(Effect.flatMap((rows) => decodeChanges(rows.map((row) => toDomainChange(row)))))

export const makePreviewMessageBuilder = (database: Database, appUrl: string, fallback: string) => {
  const linksFor = (monitorId: string, runId: string | null) => ({
    monitor: `${appUrl}${WEB_PATH.monitor(monitorId)}`,
    run: `${appUrl}${runId === null ? WEB_PATH.monitor(monitorId) : WEB_PATH.run(runId)}`,
    unsubscribe: `${appUrl}${WEB_PATH.notificationSettings}`,
  })

  return Effect.fn(SPAN.notifications.render)(function* (subject: PreviewSubject) {
    const monitorRows = yield* database.query((executor) =>
      executor
        .select({
          id: schema.monitors.id,
          name: schema.monitors.name,
          url: schema.monitors.url,
          locale: schema.users.locale,
        })
        .from(schema.monitors)
        .innerJoin(schema.users, eq(schema.monitors.userId, schema.users.id))
        .where(eq(schema.monitors.id, subject.monitorId))
        .limit(1),
    )

    const monitor = monitorRows[0]
    if (monitor === undefined) return null

    const nowMillis = yield* Clock.currentTimeMillis
    const changes = yield* latestChanges(database, subject.monitorId)
    const runId = changes[0]?.runId ?? null
    const runRow = yield* loadRun(database, runId)
    const labels = yield* loadLabels(database, subject.monitorId)

    const message = yield* decodeMessage({
      event: NOTIFICATION_EVENT.change,
      locale: resolveLocale(monitor.locale, null, fallback),
      monitor: { id: monitor.id, name: monitor.name, url: monitor.url },
      rule: { id: subject.ruleId, name: subject.ruleName },
      changes: changes.map((change) => summaryFor(change, labels)),
      run: {
        id: runId ?? subject.ruleId,
        at: runRow?.startedAt ?? new Date(nowMillis),
        durationMs: runRow?.durationMs ?? 0,
        strategy: runRow?.strategyUsed ?? null,
      },
      links: linksFor(monitor.id, runId),
      screenshotRef: null,
    })

    const preview: PreviewMessage = { message, basedOnRunId: runId }
    return preview
  })
}
