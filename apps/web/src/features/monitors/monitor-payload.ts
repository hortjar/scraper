import { MONITOR_DEFAULTS, OCCURRENCE, SCHEDULE_KIND } from "./constants"
import type {
  ExtractorDraft,
  IgnoreRuleDraft,
  MonitorFormState,
  ScheduleDraft,
} from "./monitor-form"
import { parseTags } from "./monitor-form"
import { toTransformPayload } from "./transforms"
import type {
  ExtractorInput,
  IgnoreRuleInput,
  MonitorCreateBody,
  MonitorUpdateBody,
  ScheduleInput,
} from "./types"

const trimmed = (value: string): string => value.trim()

const optionalText = (value: string): string | null => {
  const text = trimmed(value)
  return text.length === 0 ? null : text
}

const positiveInteger = (raw: string, fallback: number): number => {
  const parsed = Math.trunc(Number(trimmed(raw)))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const nonNegativeInteger = (raw: string): number | undefined => {
  const text = trimmed(raw)
  if (text.length === 0) return undefined
  const parsed = Math.trunc(Number(text))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export const toSchedulePayload = (schedule: ScheduleDraft): ScheduleInput =>
  schedule.kind === SCHEDULE_KIND.cron
    ? {
        kind: SCHEDULE_KIND.cron,
        expression: trimmed(schedule.expression),
        timezone: trimmed(schedule.timezone),
      }
    : {
        kind: SCHEDULE_KIND.interval,
        intervalSeconds: positiveInteger(
          schedule.intervalSeconds,
          MONITOR_DEFAULTS.intervalSeconds,
        ),
        timezone: trimmed(schedule.timezone),
      }

export const toExtractorPayload = (extractor: ExtractorDraft): ExtractorInput => {
  const attribute = optionalText(extractor.attribute)
  const occurrenceIndex = nonNegativeInteger(extractor.occurrenceIndex)
  const transforms = extractor.transforms.map((transform) =>
    toTransformPayload(transform.kind, transform.values),
  )

  return {
    key: trimmed(extractor.key),
    label: trimmed(extractor.label),
    selector: trimmed(extractor.selector),
    selectorKind: extractor.selectorKind,
    valueType: extractor.valueType,
    occurrence: extractor.occurrence,
    required: extractor.required,
    ...(attribute !== null && { attribute }),
    ...(occurrenceIndex !== undefined &&
      extractor.occurrence === OCCURRENCE.nth && { occurrenceIndex }),
    ...(transforms.length > 0 && { transforms }),
  }
}

export const toIgnoreRulePayload = (rule: IgnoreRuleDraft): IgnoreRuleInput => ({
  kind: rule.kind,
  value: trimmed(rule.value),
})

const extractorsPayload = (state: MonitorFormState): readonly ExtractorInput[] =>
  state.extractors.map((extractor) => toExtractorPayload(extractor))

const ignoreRulesPayload = (state: MonitorFormState): readonly IgnoreRuleInput[] =>
  state.ignoreRules
    .filter((rule) => trimmed(rule.value).length > 0)
    .map((rule) => toIgnoreRulePayload(rule))

export const toCreateBody = (state: MonitorFormState): MonitorCreateBody => ({
  name: trimmed(state.name),
  url: trimmed(state.url),
  engine: state.engine,
  enabled: state.enabled,
  respectRobots: state.respectRobots,
  contentSelector: optionalText(state.contentSelector),
  tags: [...parseTags(state.tags)],
  schedule: toSchedulePayload(state.schedule),
  extractors: [...extractorsPayload(state)],
  ignoreRules: [...ignoreRulesPayload(state)],
})

export const toUpdateBody = (state: MonitorFormState): MonitorUpdateBody => ({
  name: trimmed(state.name),
  url: trimmed(state.url),
  engine: state.engine,
  enabled: state.enabled,
  respectRobots: state.respectRobots,
  contentSelector: optionalText(state.contentSelector),
  tags: [...parseTags(state.tags)],
  schedule: toSchedulePayload(state.schedule),
  ...(state.extractorsTouched && { extractors: [...extractorsPayload(state)] }),
  ...(state.ignoreRulesTouched && { ignoreRules: [...ignoreRulesPayload(state)] }),
})
