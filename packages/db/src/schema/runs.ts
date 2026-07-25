import type { DiffHunk } from "@scraper/core/domain"
import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"

import { bytea, nullableTimestamp, primaryId } from "./columns.js"
import { changeKindEnum, runStatusEnum, runTriggerEnum, strategyEnum } from "./enums.js"
import { monitors } from "./monitors.js"

export const runs = pgTable(
  "runs",
  {
    id: primaryId(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    trigger: runTriggerEnum("trigger").notNull(),
    status: runStatusEnum("status").notNull(),
    strategyUsed: strategyEnum("strategy_used"),
    startedAt: nullableTimestamp("started_at").notNull(),
    finishedAt: nullableTimestamp("finished_at"),
    durationMs: integer("duration_ms"),
    httpStatus: integer("http_status"),
    bytes: integer("bytes"),
    contentHash: bytea("content_hash"),
    changed: boolean("changed").notNull().default(false),
    errorKind: text("error_kind"),
    errorMessage: text("error_message"),
    attempt: integer("attempt").notNull().default(1),
    jobId: text("job_id"),
    createdAt: nullableTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("runs_monitor_started_idx").on(table.monitorId, table.startedAt),
    index("runs_changed_idx")
      .on(table.monitorId)
      .where(sql`${table.changed}`),
    index("runs_job_idx").on(table.jobId),
    check("runs_attempt_positive", sql`${table.attempt} >= 1`),
  ],
)

export const snapshots = pgTable(
  "snapshots",
  {
    id: primaryId(),
    runId: uuid("run_id").notNull(),
    monitorId: uuid("monitor_id").notNull(),
    content: text("content").notNull(),
    rawRef: text("raw_ref"),
    screenshotRef: text("screenshot_ref"),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: nullableTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("snapshots_run_idx").on(table.runId),
    index("snapshots_monitor_created_idx").on(table.monitorId, table.createdAt),
  ],
)

export const fieldValues = pgTable(
  "field_values",
  {
    id: primaryId(),
    runId: uuid("run_id").notNull(),
    monitorId: uuid("monitor_id").notNull(),
    extractorKey: text("extractor_key").notNull(),
    raw: text("raw"),
    valueText: text("value_text"),
    valueNumber: numeric("value_number"),
    valueBool: boolean("value_bool"),
    valueList: jsonb("value_list").$type<string[]>(),
    missing: boolean("missing").notNull().default(false),
    createdAt: nullableTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("field_values_series_idx").on(table.monitorId, table.extractorKey, table.runId),
    index("field_values_run_idx").on(table.runId),
  ],
)

export const changes = pgTable(
  "changes",
  {
    id: primaryId(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    runId: uuid("run_id").notNull(),
    previousRunId: uuid("previous_run_id"),
    extractorKey: text("extractor_key"),
    changeKind: changeKindEnum("change_kind").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    oldNumber: numeric("old_number"),
    newNumber: numeric("new_number"),
    deltaAbsolute: numeric("delta_absolute"),
    deltaPercent: numeric("delta_percent"),
    diff: jsonb("diff").$type<DiffHunk[]>(),
    createdAt: nullableTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("changes_monitor_created_idx").on(table.monitorId, table.createdAt),
    index("changes_run_idx").on(table.runId),
  ],
)
