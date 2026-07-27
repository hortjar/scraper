import { DELIVERY_STATUS, REDIS_KEY, SPAN, SUPPRESSION_REASON } from "@scraper/core/constants"
import type { Change, MonitorId, RunId } from "@scraper/core/domain"
import { Effect } from "effect"

import { JobProducer, RedisClient } from "../../jobs/index.js"
import { DeliveryRepository, RuleRepository } from "../../notifications/index.js"
import type { ChangeDraft } from "../diff/field-diff.js"
import { DEDUPE_TTL_FLOOR_SECONDS } from "../runs.constants.js"

import { decideDelivery, isHeldForLaterDelivery, messageHash } from "./suppression.js"
import { matchTrigger } from "./trigger-match.js"
import type { TriggerContext } from "./trigger-match.js"

export interface RuleEvaluationInput {
  readonly monitorId: MonitorId
  readonly runId: RunId
  readonly changes: readonly Change[]
  readonly drafts: readonly ChangeDraft[]
  readonly runFailed: boolean
  readonly previousRunFailed: boolean
  readonly lastChangeAt: Date | null
  readonly now: Date
}

const changeIdsFor = (
  matched: readonly ChangeDraft[],
  persisted: readonly Change[],
): readonly Change["id"][] =>
  persisted
    .filter((change) =>
      matched.some(
        (draft) =>
          draft.extractorKey === change.extractorKey && draft.changeKind === change.changeKind,
      ),
    )
    .map((change) => change.id)

const dedupeTtlSeconds = (throttleSeconds: number): number =>
  Math.max(throttleSeconds, DEDUPE_TTL_FLOOR_SECONDS)

export const evaluateRules = Effect.fn(SPAN.runs.evaluateRules)(function* (
  input: RuleEvaluationInput,
) {
  const rules = yield* RuleRepository
  const deliveries = yield* DeliveryRepository
  const producer = yield* JobProducer
  const redis = yield* RedisClient

  const active = yield* rules.listActiveForMonitor(input.monitorId)
  const context: TriggerContext = {
    changes: input.drafts,
    runFailed: input.runFailed,
    previousRunFailed: input.previousRunFailed,
    lastChangeAt: input.lastChangeAt,
    now: input.now,
  }

  let fired = 0
  for (const rule of active) {
    const matched = matchTrigger(rule.trigger, rule.extractorKey, context)
    if (matched === null) continue

    const hash = messageHash(matched)
    const isFirstSighting = yield* redis.setIfAbsent(
      REDIS_KEY.notifyDedupe(rule.id, hash),
      dedupeTtlSeconds(rule.throttleSeconds),
    )

    const reason = isFirstSighting
      ? decideDelivery({ ...rule, now: input.now })
      : SUPPRESSION_REASON.duplicate

    const delivery = yield* deliveries.insert({
      ruleId: rule.id,
      channelId: rule.channelId,
      monitorId: input.monitorId,
      changeIds: changeIdsFor(matched, input.changes),
      status: reason === null ? DELIVERY_STATUS.pending : DELIVERY_STATUS.suppressed,
      ...(reason !== null && { suppressedReason: reason }),
      messageHash: hash,
    })

    if (reason === null) {
      yield* producer.enqueueNotify({ deliveryId: delivery.id })
      yield* rules.markFired(rule.id, input.now)
      fired += 1
      continue
    }

    if (isHeldForLaterDelivery(reason)) {
      yield* redis.addSetMember(REDIS_KEY.digestBucket(rule.id), delivery.id)
    }
  }

  return { evaluated: active.length, fired }
})

export { type ActiveRule } from "../../notifications/index.js"
