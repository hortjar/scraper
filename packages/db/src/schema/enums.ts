import {
  ACTOR_KIND,
  CHANGE_KIND,
  DELIVERY_MODE,
  DELIVERY_STATUS,
  ENGINE,
  MONITOR_STATUS,
  OCCURRENCE,
  RUN_STATUS,
  RUN_TRIGGER,
  SCHEDULE_KIND,
  SELECTOR_KIND,
  STRATEGY,
  SUPPRESSION_REASON,
  TOKEN_PURPOSE,
  TRIGGER_KIND,
  USER_ROLE,
  USER_STATUS,
  VALUE_TYPE,
} from "@scraper/core/constants"
import { pgEnum } from "drizzle-orm/pg-core"

const values = <T extends Record<string, string>>(source: T) =>
  Object.values(source) as [T[keyof T], ...T[keyof T][]]

export const userRoleEnum = pgEnum("user_role", values(USER_ROLE))
export const userStatusEnum = pgEnum("user_status", values(USER_STATUS))
export const tokenPurposeEnum = pgEnum("token_purpose", values(TOKEN_PURPOSE))
export const actorKindEnum = pgEnum("actor_kind", values(ACTOR_KIND))

export const engineEnum = pgEnum("engine", values(ENGINE))
export const strategyEnum = pgEnum("strategy", values(STRATEGY))
export const monitorStatusEnum = pgEnum("monitor_status", values(MONITOR_STATUS))
export const scheduleKindEnum = pgEnum("schedule_kind", values(SCHEDULE_KIND))
export const selectorKindEnum = pgEnum("selector_kind", values(SELECTOR_KIND))
export const valueTypeEnum = pgEnum("value_type", values(VALUE_TYPE))
export const occurrenceEnum = pgEnum("occurrence", values(OCCURRENCE))

export const runTriggerEnum = pgEnum("run_trigger", values(RUN_TRIGGER))
export const runStatusEnum = pgEnum("run_status", values(RUN_STATUS))
export const changeKindEnum = pgEnum("change_kind", values(CHANGE_KIND))

export const triggerKindEnum = pgEnum("trigger_kind", values(TRIGGER_KIND))
export const deliveryModeEnum = pgEnum("delivery_mode", values(DELIVERY_MODE))
export const deliveryStatusEnum = pgEnum("delivery_status", values(DELIVERY_STATUS))
export const suppressionReasonEnum = pgEnum("suppression_reason", values(SUPPRESSION_REASON))
