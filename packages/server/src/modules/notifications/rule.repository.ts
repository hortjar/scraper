import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type {
  ChannelId,
  DeliveryMode,
  ExtractorKey,
  MonitorId,
  QuietHours,
  RuleId,
  TriggerConfig,
} from "@scraper/core/domain"
import { Database, schema } from "@scraper/db"
import { and, eq, sql } from "drizzle-orm"
import { Effect } from "effect"

import { makeRuleCrud } from "./rule.repository.crud.js"

export interface ActiveRule {
  readonly id: RuleId
  readonly monitorId: MonitorId
  readonly channelId: ChannelId
  readonly name: string
  readonly trigger: TriggerConfig
  readonly extractorKey: ExtractorKey | null
  readonly deliveryMode: DeliveryMode
  readonly throttleSeconds: number
  readonly quietHours: QuietHours | null
  readonly lastFiredAt: Date | null
  readonly channelEnabled: boolean
  readonly channelVerified: boolean
}

export class RuleRepository extends Effect.Service<RuleRepository>()(SERVICE_TAG.RuleRepository, {
  effect: Effect.gen(function* () {
    const database = yield* Database

    const listActiveForMonitor = Effect.fn(SPAN.ruleRepository.list)(function* (
      monitorId: MonitorId,
    ) {
      const rows = yield* database.query((executor) =>
        executor
          .select({
            id: schema.notificationRules.id,
            monitorId: schema.notificationRules.monitorId,
            channelId: schema.notificationRules.channelId,
            name: schema.notificationRules.name,
            trigger: schema.notificationRules.triggerConfig,
            extractorKey: schema.notificationRules.extractorKey,
            deliveryMode: schema.notificationRules.deliveryMode,
            throttleSeconds: schema.notificationRules.throttleSeconds,
            quietHours: schema.notificationRules.quietHours,
            lastFiredAt: schema.notificationRules.lastFiredAt,
            channelEnabled: schema.notificationChannels.enabled,
            channelVerifiedAt: schema.notificationChannels.verifiedAt,
          })
          .from(schema.notificationRules)
          .innerJoin(
            schema.notificationChannels,
            eq(schema.notificationRules.channelId, schema.notificationChannels.id),
          )
          .where(
            and(
              eq(schema.notificationRules.monitorId, monitorId),
              eq(schema.notificationRules.enabled, true),
            ),
          ),
      )

      return rows.map((row): ActiveRule => ({
        id: row.id as RuleId,
        monitorId: row.monitorId as MonitorId,
        channelId: row.channelId as ChannelId,
        name: row.name,
        trigger: row.trigger,
        extractorKey: row.extractorKey as ExtractorKey | null,
        deliveryMode: row.deliveryMode,
        throttleSeconds: row.throttleSeconds,
        quietHours: row.quietHours,
        lastFiredAt: row.lastFiredAt,
        channelEnabled: row.channelEnabled,
        channelVerified: row.channelVerifiedAt !== null,
      }))
    })

    const markFired = Effect.fn(SPAN.ruleRepository.markFired)(function* (
      ruleId: RuleId,
      firedAt: Date,
    ) {
      yield* database.query((executor) =>
        executor
          .update(schema.notificationRules)
          .set({ lastFiredAt: sql`${firedAt.toISOString()}::timestamptz` })
          .where(eq(schema.notificationRules.id, ruleId)),
      )
    })

    return { listActiveForMonitor, markFired, ...makeRuleCrud(database) } as const
  }),
  dependencies: [Database.Default],
}) {}

export const RuleRepositoryLive = RuleRepository.Default
