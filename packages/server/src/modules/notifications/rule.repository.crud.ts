import { SPAN } from "@scraper/core/constants"
import { NotificationRule } from "@scraper/core/domain"
import type { MonitorId, RuleId, UserId } from "@scraper/core/domain"
import { RuleNotFound } from "@scraper/core/errors"
import type { Database } from "@scraper/db"
import { constraintFailure, decodeRow, schema } from "@scraper/db"
import { and, desc, eq } from "drizzle-orm"
import { Effect } from "effect"

const RULE_ENTITY = "notification_rule"

const decodeRule = decodeRow(NotificationRule, RULE_ENTITY)

const RULE_COLUMNS = {
  id: schema.notificationRules.id,
  monitorId: schema.notificationRules.monitorId,
  channelId: schema.notificationRules.channelId,
  name: schema.notificationRules.name,
  trigger: schema.notificationRules.triggerConfig,
  extractorKey: schema.notificationRules.extractorKey,
  deliveryMode: schema.notificationRules.deliveryMode,
  digestCron: schema.notificationRules.digestCron,
  throttleSeconds: schema.notificationRules.throttleSeconds,
  quietHours: schema.notificationRules.quietHours,
  template: schema.notificationRules.template,
  enabled: schema.notificationRules.enabled,
  createdAt: schema.notificationRules.createdAt,
  updatedAt: schema.notificationRules.updatedAt,
} as const

export interface RuleInsert {
  readonly monitorId: MonitorId
  readonly channelId: string
  readonly name: string
  readonly triggerKind: typeof schema.notificationRules.$inferInsert.triggerKind
  readonly triggerConfig: typeof schema.notificationRules.$inferInsert.triggerConfig
  readonly extractorKey: string | null
  readonly deliveryMode: typeof schema.notificationRules.$inferInsert.deliveryMode
  readonly digestCron: string | null
  readonly throttleSeconds: number
  readonly quietHours: typeof schema.notificationRules.$inferInsert.quietHours
  readonly template: string | null
  readonly enabled: boolean
}

export type RulePatch = Partial<Omit<RuleInsert, "monitorId">>

export const makeRuleCrud = (database: Database) => {
  const ownedRule = (userId: UserId, ruleId: RuleId) =>
    database
      .query((executor) =>
        executor
          .select(RULE_COLUMNS)
          .from(schema.notificationRules)
          .innerJoin(schema.monitors, eq(schema.notificationRules.monitorId, schema.monitors.id))
          .where(and(eq(schema.notificationRules.id, ruleId), eq(schema.monitors.userId, userId)))
          .limit(1),
      )
      .pipe(Effect.map((rows) => rows[0] ?? null))

  const findById = Effect.fn(SPAN.ruleRepository.findById)(function* (
    userId: UserId,
    ruleId: RuleId,
  ) {
    const row = yield* ownedRule(userId, ruleId)
    if (row === null) return yield* Effect.fail(new RuleNotFound({ id: ruleId }))
    return yield* decodeRule(row)
  })

  const listForMonitor = Effect.fn(SPAN.ruleRepository.listForMonitor)(function* (
    userId: UserId,
    monitorId: MonitorId,
  ) {
    const rows = yield* database.query((executor) =>
      executor
        .select(RULE_COLUMNS)
        .from(schema.notificationRules)
        .innerJoin(schema.monitors, eq(schema.notificationRules.monitorId, schema.monitors.id))
        .where(
          and(
            eq(schema.notificationRules.monitorId, monitorId),
            eq(schema.monitors.userId, userId),
          ),
        )
        .orderBy(desc(schema.notificationRules.createdAt)),
    )
    return yield* Effect.forEach(rows, (row) => decodeRule(row))
  })

  const ownsMonitor = (userId: UserId, monitorId: MonitorId) =>
    database
      .query((executor) =>
        executor
          .select({ id: schema.monitors.id })
          .from(schema.monitors)
          .where(and(eq(schema.monitors.id, monitorId), eq(schema.monitors.userId, userId)))
          .limit(1),
      )
      .pipe(Effect.map((rows) => rows.length > 0))

  const insert = Effect.fn(SPAN.ruleRepository.insert)(function* (input: RuleInsert) {
    const rows = yield* database
      .query((executor) => executor.insert(schema.notificationRules).values(input).returning())
      .pipe(Effect.mapError((error) => constraintFailure(error, RULE_ENTITY)))
    const row = rows[0]
    if (row === undefined) return yield* Effect.fail(new RuleNotFound({ id: input.monitorId }))
    return yield* decodeRule({ ...row, trigger: row.triggerConfig })
  })

  const update = Effect.fn(SPAN.ruleRepository.update)(function* (
    userId: UserId,
    ruleId: RuleId,
    patch: RulePatch,
  ) {
    const existing = yield* ownedRule(userId, ruleId)
    if (existing === null) return yield* Effect.fail(new RuleNotFound({ id: ruleId }))

    const rows = yield* database
      .query((executor) =>
        executor
          .update(schema.notificationRules)
          .set(patch)
          .where(eq(schema.notificationRules.id, ruleId))
          .returning(),
      )
      .pipe(Effect.mapError((error) => constraintFailure(error, RULE_ENTITY)))
    const row = rows[0]
    if (row === undefined) return yield* Effect.fail(new RuleNotFound({ id: ruleId }))
    return yield* decodeRule({ ...row, trigger: row.triggerConfig })
  })

  const remove = Effect.fn(SPAN.ruleRepository.remove)(function* (userId: UserId, ruleId: RuleId) {
    const existing = yield* ownedRule(userId, ruleId)
    if (existing === null) return yield* Effect.fail(new RuleNotFound({ id: ruleId }))
    yield* database.query((executor) =>
      executor.delete(schema.notificationRules).where(eq(schema.notificationRules.id, ruleId)),
    )
  })

  return { findById, listForMonitor, insert, update, remove, ownsMonitor } as const
}
