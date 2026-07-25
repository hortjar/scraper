import type {
  BrowserOptions,
  IgnoreRule,
  RequestOptions,
  Transform,
} from "@scraper/core/domain"
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

import { nullableTimestamp, primaryId, timestamps } from "./columns.js"
import {
  engineEnum,
  monitorStatusEnum,
  occurrenceEnum,
  scheduleKindEnum,
  selectorKindEnum,
  strategyEnum,
  valueTypeEnum,
} from "./enums.js"
import { users } from "./identity.js"

export const monitors = pgTable(
  "monitors",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    engine: engineEnum("engine").notNull().default("auto"),
    engineResolved: strategyEnum("engine_resolved"),
    engineResolvedAt: nullableTimestamp("engine_resolved_at"),
    request: jsonb("request").$type<RequestOptions>().notNull().default({}),
    browserOptions: jsonb("browser_options").$type<BrowserOptions>().notNull().default({}),
    scheduleKind: scheduleKindEnum("schedule_kind").notNull(),
    scheduleValue: text("schedule_value").notNull(),
    scheduleTimezone: text("schedule_timezone").notNull().default("UTC"),
    jitterSeconds: integer("jitter_seconds").notNull().default(30),
    enabled: boolean("enabled").notNull().default(true),
    status: monitorStatusEnum("status").notNull().default("ok"),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    contentSelector: text("content_selector"),
    ignoreRules: jsonb("ignore_rules").$type<IgnoreRule[]>().notNull().default([]),
    respectRobots: boolean("respect_robots").notNull().default(true),
    lastRunAt: nullableTimestamp("last_run_at"),
    nextRunAt: nullableTimestamp("next_run_at"),
    lastChangeAt: nullableTimestamp("last_change_at"),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    archivedAt: nullableTimestamp("archived_at"),
    ...timestamps(),
  },
  (table) => [
    index("monitors_user_active_idx").on(table.userId, table.archivedAt),
    index("monitors_due_idx").on(table.enabled, table.nextRunAt),
    index("monitors_tags_idx").using("gin", table.tags),
    check("monitors_jitter_non_negative", sql`${table.jitterSeconds} >= 0`),
    check(
      "monitors_consecutive_failures_non_negative",
      sql`${table.consecutiveFailures} >= 0`,
    ),
  ],
)

export const extractors = pgTable(
  "extractors",
  {
    id: primaryId(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    selectorKind: selectorKindEnum("selector_kind").notNull(),
    selector: text("selector").notNull(),
    attribute: text("attribute"),
    valueType: valueTypeEnum("value_type").notNull(),
    transforms: jsonb("transforms").$type<Transform[]>().notNull().default([]),
    occurrence: occurrenceEnum("occurrence").notNull().default("first"),
    occurrenceIndex: integer("occurrence_index"),
    required: boolean("required").notNull().default(true),
    position: integer("position").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("extractors_monitor_key_key").on(table.monitorId, table.key),
    index("extractors_monitor_position_idx").on(table.monitorId, table.position),
    check(
      "extractors_nth_requires_index",
      sql`${table.occurrence} <> 'nth' OR ${table.occurrenceIndex} IS NOT NULL`,
    ),
  ],
)
