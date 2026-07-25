import { sql } from "drizzle-orm"
import { check, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { bytea, citext, nullableTimestamp, primaryId, timestamps } from "./columns.js"
import { tokenPurposeEnum, userRoleEnum, userStatusEnum } from "./enums.js"

export interface PlanLimitsJson {
  readonly maxMonitors: number
  readonly minIntervalSeconds: number
  readonly maxChannels: number
}

export const users = pgTable(
  "users",
  {
    id: primaryId(),
    email: citext("email").notNull(),
    emailVerifiedAt: nullableTimestamp("email_verified_at"),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    timezone: text("timezone").notNull().default("UTC"),
    locale: text("locale").notNull().default("en"),
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    planLimits: jsonb("plan_limits").$type<PlanLimitsJson>().notNull(),
    ...timestamps(),
  },
  (table) => [uniqueIndex("users_email_key").on(table.email)],
)

export const sessions = pgTable(
  "sessions",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: bytea("token_hash").notNull(),
    expiresAt: nullableTimestamp("expires_at").notNull(),
    lastSeenAt: nullableTimestamp("last_seen_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    revokedAt: nullableTimestamp("revoked_at"),
    createdAt: nullableTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_key").on(table.tokenHash),
    index("sessions_user_active_idx").on(table.userId, table.revokedAt),
    index("sessions_expires_idx").on(table.expiresAt),
    check("sessions_expiry_after_creation", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
)

export const apiKeys = pgTable(
  "api_keys",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: bytea("key_hash").notNull(),
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`'{}'`),
    lastUsedAt: nullableTimestamp("last_used_at"),
    expiresAt: nullableTimestamp("expires_at"),
    revokedAt: nullableTimestamp("revoked_at"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("api_keys_key_hash_key").on(table.keyHash),
    index("api_keys_user_idx").on(table.userId, table.revokedAt),
    uniqueIndex("api_keys_user_name_key").on(table.userId, table.name),
  ],
)

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: tokenPurposeEnum("purpose").notNull(),
    tokenHash: bytea("token_hash").notNull(),
    expiresAt: nullableTimestamp("expires_at").notNull(),
    consumedAt: nullableTimestamp("consumed_at"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    attempts: integer("attempts").notNull().default(0),
    createdAt: nullableTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("verification_tokens_hash_key").on(table.tokenHash),
    index("verification_tokens_user_purpose_idx").on(table.userId, table.purpose),
    index("verification_tokens_expires_idx").on(table.expiresAt),
  ],
)
