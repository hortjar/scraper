import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core"

import { nullableTimestamp, primaryId } from "./columns.js"
import { logLevelEnum } from "./enums.js"

export const appLogs = pgTable(
  "app_logs",
  {
    id: primaryId(),
    at: nullableTimestamp("at").notNull().defaultNow(),
    level: logLevelEnum("level").notNull(),
    service: text("service").notNull(),
    message: text("message").notNull(),
    annotations: jsonb("annotations").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index("app_logs_at_idx").on(table.at),
    index("app_logs_level_at_idx").on(table.level, table.at),
    index("app_logs_service_at_idx").on(table.service, table.at),
  ],
)
