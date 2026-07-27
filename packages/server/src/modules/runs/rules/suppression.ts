import { createHash } from "node:crypto"

import { DELIVERY_MODE, SUPPRESSION_REASON } from "@scraper/core/constants"
import type { DeliveryMode, QuietHours, SuppressionReason } from "@scraper/core/domain"

import type { ChangeDraft } from "../diff/field-diff.js"
import { HASH_FIELD_SEPARATOR, HASH_RECORD_SEPARATOR } from "../runs.constants.js"

import { isWithinQuietHours } from "./quiet-hours.js"

const MILLIS_PER_SECOND = 1000

export interface DeliveryDecisionInput {
  readonly channelEnabled: boolean
  readonly channelVerified: boolean
  readonly throttleSeconds: number
  readonly lastFiredAt: Date | null
  readonly quietHours: QuietHours | null
  readonly deliveryMode: DeliveryMode
  readonly now: Date
}

export const isThrottled = (
  throttleSeconds: number,
  lastFiredAt: Date | null,
  now: Date,
): boolean => {
  if (lastFiredAt === null || throttleSeconds <= 0) return false
  return now.getTime() - lastFiredAt.getTime() < throttleSeconds * MILLIS_PER_SECOND
}

export const decideDelivery = (input: DeliveryDecisionInput): SuppressionReason | null => {
  if (!input.channelEnabled) return SUPPRESSION_REASON.channelDisabled
  if (!input.channelVerified) return SUPPRESSION_REASON.channelUnverified
  if (isThrottled(input.throttleSeconds, input.lastFiredAt, input.now)) {
    return SUPPRESSION_REASON.throttled
  }
  if (input.quietHours !== null && isWithinQuietHours(input.quietHours, input.now)) {
    return SUPPRESSION_REASON.quietHours
  }
  if (input.deliveryMode === DELIVERY_MODE.digest) return SUPPRESSION_REASON.digestPending
  return null
}

export const isHeldForLaterDelivery = (reason: SuppressionReason | null): boolean =>
  reason === SUPPRESSION_REASON.digestPending || reason === SUPPRESSION_REASON.quietHours

export const messageHash = (changes: readonly ChangeDraft[]): string => {
  const canonical = changes
    .map((change) =>
      [
        change.extractorKey ?? "",
        change.changeKind,
        change.oldValue ?? "",
        change.newValue ?? "",
      ].join(HASH_FIELD_SEPARATOR),
    )
    .toSorted((left, right) => left.localeCompare(right))
    .join(HASH_RECORD_SEPARATOR)
  return createHash("sha256").update(canonical, "utf8").digest("hex")
}
