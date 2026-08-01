import { NOTIFICATION_EVENT, SPAN } from "@scraper/core/constants"
import { Change, ChannelId, NotificationMessage, UserId } from "@scraper/core/domain"
import type { ChangeSummary, DeliveryId } from "@scraper/core/domain"
import { resolveLocale } from "@scraper/core/i18n"
import type { Database } from "@scraper/db"
import { decodeRow, decodeRows, schema, toDomainChange } from "@scraper/db"
import { asc, eq, inArray } from "drizzle-orm"
import { Effect } from "effect"

import { WEB_PATH } from "./notifications.constants.js"

const decodeChanges = decodeRows(Change, "change")
const decodeMessage = decodeRow(NotificationMessage, "notification_message")
const decodeUserId = decodeRow(UserId, "user_id")
const decodeChannelId = decodeRow(ChannelId, "channel_id")

export interface DeliveryContext {
  readonly userId: UserId
  readonly channelId: ChannelId
  readonly message: NotificationMessage
  readonly customTemplate: string | null
}

export const summaryFor = (change: Change, labels: ReadonlyMap<string, string>): ChangeSummary => ({
  key: change.extractorKey,
  label:
    change.extractorKey === null ? "" : (labels.get(change.extractorKey) ?? change.extractorKey),
  changeKind: change.changeKind,
  oldValue: change.oldValue,
  newValue: change.newValue,
  deltaAbsolute: change.deltaAbsolute,
  deltaPercent: change.deltaPercent,
})

const loadChanges = (database: Database, changeIds: readonly string[]) =>
  changeIds.length === 0
    ? Effect.succeed([] as readonly Change[])
    : database
        .query((executor) =>
          executor
            .select()
            .from(schema.changes)
            .where(inArray(schema.changes.id, [...changeIds]))
            .orderBy(asc(schema.changes.createdAt)),
        )
        .pipe(Effect.flatMap((rows) => decodeChanges(rows.map((row) => toDomainChange(row)))))

export const loadLabels = (database: Database, monitorId: string) =>
  database
    .query((executor) =>
      executor
        .select({ key: schema.extractors.key, label: schema.extractors.label })
        .from(schema.extractors)
        .where(eq(schema.extractors.monitorId, monitorId)),
    )
    .pipe(Effect.map((rows) => new Map(rows.map((extractor) => [extractor.key, extractor.label]))))

export const loadRun = (database: Database, runId: string | null) =>
  runId === null
    ? Effect.succeed(undefined)
    : database
        .query((executor) =>
          executor.select().from(schema.runs).where(eq(schema.runs.id, runId)).limit(1),
        )
        .pipe(Effect.map((rows) => rows[0]))

export const makeDeliveryContextLoader = (database: Database, appUrl: string, fallback: string) => {
  const linksFor = (monitorId: string, runId: string) => ({
    monitor: `${appUrl}${WEB_PATH.monitor(monitorId)}`,
    run: `${appUrl}${WEB_PATH.run(runId)}`,
    unsubscribe: `${appUrl}${WEB_PATH.notificationSettings}`,
  })

  return Effect.fn(SPAN.notifications.dispatch)(function* (deliveryId: DeliveryId) {
    const rows = yield* database.query((executor) =>
      executor
        .select({
          delivery: schema.notificationDeliveries,
          rule: schema.notificationRules,
          monitor: schema.monitors,
          locale: schema.users.locale,
        })
        .from(schema.notificationDeliveries)
        .innerJoin(
          schema.notificationRules,
          eq(schema.notificationDeliveries.ruleId, schema.notificationRules.id),
        )
        .innerJoin(schema.monitors, eq(schema.notificationDeliveries.monitorId, schema.monitors.id))
        .innerJoin(schema.users, eq(schema.monitors.userId, schema.users.id))
        .where(eq(schema.notificationDeliveries.id, deliveryId))
        .limit(1),
    )

    const row = rows[0]
    if (row === undefined) return null

    const changes = yield* loadChanges(database, row.delivery.changeIds)
    const labels = yield* loadLabels(database, row.delivery.monitorId)
    const runId = changes[0]?.runId ?? null
    const runRow = yield* loadRun(database, runId)

    const message = yield* decodeMessage({
      event: NOTIFICATION_EVENT.change,
      locale: resolveLocale(row.locale, null, fallback),
      monitor: { id: row.monitor.id, name: row.monitor.name, url: row.monitor.url },
      rule: { id: row.rule.id, name: row.rule.name },
      changes: changes.map((change) => summaryFor(change, labels)),
      run: {
        id: runId ?? row.delivery.id,
        at: runRow?.startedAt ?? row.delivery.createdAt,
        durationMs: runRow?.durationMs ?? 0,
        strategy: runRow?.strategyUsed ?? null,
      },
      links: linksFor(row.monitor.id, runId ?? row.delivery.id),
      screenshotRef: null,
    })

    const context: DeliveryContext = {
      userId: yield* decodeUserId(row.monitor.userId),
      channelId: yield* decodeChannelId(row.delivery.channelId),
      message,
      customTemplate: row.rule.template,
    }
    return context
  })
}
