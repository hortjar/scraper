import type { QuietHours, TriggerConfig } from "@scraper/core/domain"
import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { bytea, nullableTimestamp, primaryId, timestamps } from "./columns.js"
import {
  deliveryModeEnum,
  deliveryStatusEnum,
  suppressionReasonEnum,
  triggerKindEnum,
} from "./enums.js"
import { users } from "./identity.js"
import { monitors } from "./monitors.js"

export const notificationChannels = pgTable(
  "notification_channels",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    secret: bytea("secret"),
    secretIv: bytea("secret_iv"),
    secretTag: bytea("secret_tag"),
    verifiedAt: nullableTimestamp("verified_at"),
    enabled: boolean("enabled").notNull().default(true),
    failureCount: integer("failure_count").notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("notification_channels_user_name_key").on(table.userId, table.name),
    index("notification_channels_user_kind_idx").on(table.userId, table.kind),
    check(
      "notification_channels_secret_complete",
      sql`(${table.secret} IS NULL) = (${table.secretIv} IS NULL) AND (${table.secret} IS NULL) = (${table.secretTag} IS NULL)`,
    ),
  ],
)

export const notificationRules = pgTable(
  "notification_rules",
  {
    id: primaryId(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    triggerKind: triggerKindEnum("trigger_kind").notNull(),
    triggerConfig: jsonb("trigger_config").$type<TriggerConfig>().notNull(),
    extractorKey: text("extractor_key"),
    deliveryMode: deliveryModeEnum("delivery_mode").notNull().default("immediate"),
    digestCron: text("digest_cron"),
    throttleSeconds: integer("throttle_seconds").notNull().default(0),
    quietHours: jsonb("quiet_hours").$type<QuietHours>(),
    template: text("template"),
    enabled: boolean("enabled").notNull().default(true),
    lastFiredAt: nullableTimestamp("last_fired_at"),
    ...timestamps(),
  },
  (table) => [
    index("notification_rules_monitor_idx").on(table.monitorId, table.enabled),
    index("notification_rules_channel_idx").on(table.channelId),
    check("notification_rules_throttle_non_negative", sql`${table.throttleSeconds} >= 0`),
    check(
      "notification_rules_digest_requires_cron",
      sql`${table.deliveryMode} <> 'digest' OR ${table.digestCron} IS NOT NULL`,
    ),
  ],
)

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: primaryId(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => notificationRules.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.id, { onDelete: "cascade" }),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    changeIds: uuid("change_ids").array().notNull().default(sql`'{}'`),
    status: deliveryStatusEnum("status").notNull().default("pending"),
    suppressedReason: suppressionReasonEnum("suppressed_reason"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    payloadPreview: jsonb("payload_preview").$type<Record<string, unknown>>(),
    messageHash: text("message_hash"),
    sentAt: nullableTimestamp("sent_at"),
    ...timestamps(),
  },
  (table) => [
    index("notification_deliveries_rule_idx").on(table.ruleId, table.createdAt),
    index("notification_deliveries_pending_idx")
      .on(table.status)
      .where(sql`${table.status} = 'pending'`),
    check(
      "notification_deliveries_suppressed_has_reason",
      sql`${table.status} <> 'suppressed' OR ${table.suppressedReason} IS NOT NULL`,
    ),
  ],
)
