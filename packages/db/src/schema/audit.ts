import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core"

import { nullableTimestamp, primaryId } from "./columns.js"
import { actorKindEnum } from "./enums.js"
import { users } from "./identity.js"

export const auditLog = pgTable(
  "audit_log",
  {
    id: primaryId(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    actorKind: actorKindEnum("actor_kind").notNull(),
    action: text("action").notNull(),
    subjectKind: text("subject_kind"),
    subjectId: uuid("subject_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: nullableTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_user_created_idx").on(table.userId, table.createdAt),
    index("audit_log_action_idx").on(table.action, table.createdAt),
    index("audit_log_subject_idx").on(table.subjectKind, table.subjectId),
  ],
)
