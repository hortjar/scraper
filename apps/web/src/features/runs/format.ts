import type { BadgeProperties } from "../../components/ui"

import { NUMERIC_CHANGE_KINDS, RUN_STATUS } from "./constants"
import type { ChangeKind, RunStatus, RunTrigger } from "./types"

export type BadgeTone = NonNullable<BadgeProperties["tone"]>

export const RUN_STATUS_TONE = {
  running: "info",
  success: "positive",
  failed: "negative",
  skipped: "neutral",
} as const satisfies Record<RunStatus, BadgeTone>

export const RUN_STATUS_KEY = {
  running: "status.running",
  success: "status.success",
  failed: "status.failed",
  skipped: "status.skipped",
} as const satisfies Record<RunStatus, string>

export const RUN_TRIGGER_KEY = {
  schedule: "trigger.schedule",
  manual: "trigger.manual",
  retry: "trigger.retry",
  test: "trigger.test",
} as const satisfies Record<RunTrigger, string>

export const CHANGE_KIND_KEY = {
  appeared: "changeKind.appeared",
  disappeared: "changeKind.disappeared",
  modified: "changeKind.modified",
  increased: "changeKind.increased",
  decreased: "changeKind.decreased",
} as const satisfies Record<ChangeKind, string>

export const CHANGE_KIND_TONE = {
  appeared: "positive",
  disappeared: "negative",
  modified: "info",
  increased: "positive",
  decreased: "negative",
} as const satisfies Record<ChangeKind, BadgeTone>

export const isNumericChangeKind = (kind: ChangeKind): boolean => NUMERIC_CHANGE_KINDS.has(kind)

export const isFailedStatus = (status: RunStatus): boolean => status === RUN_STATUS.failed

export const percentToRatio = (percent: number): number => percent / 100
