import { EXTRACTOR_KEY_PATTERN, MONITOR_DEFAULTS, SCHEDULE_KIND } from "./constants"
import {
  FIELD_PATH,
  type FieldIssues,
  extractorPath,
  ignoreRulePath,
  schedulePath,
} from "./field-issues"
import type { MonitorFormState } from "./monitor-form"

export const VALIDATION_KEY = {
  nameRequired: "validation.nameRequired",
  nameTooLong: "validation.nameTooLong",
  urlRequired: "validation.urlRequired",
  urlInvalid: "validation.urlInvalid",
  timezoneRequired: "validation.timezoneRequired",
  intervalInvalid: "validation.intervalInvalid",
  intervalTooShort: "validation.intervalTooShort",
  expressionRequired: "validation.expressionRequired",
  extractorsRequired: "validation.extractorsRequired",
  extractorsTooMany: "validation.extractorsTooMany",
  keyRequired: "validation.keyRequired",
  keyInvalid: "validation.keyInvalid",
  keyDuplicate: "validation.keyDuplicate",
  labelRequired: "validation.labelRequired",
  selectorRequired: "validation.selectorRequired",
  ruleValueRequired: "validation.ruleValueRequired",
} as const

const HTTP_PROTOCOLS = new Set(["http:", "https:"])

export const isValidUrl = (raw: string): boolean => {
  try {
    return HTTP_PROTOCOLS.has(new URL(raw).protocol)
  } catch {
    return false
  }
}

const validateSchedule = (state: MonitorFormState): FieldIssues => {
  const issues: Record<string, string> = {}
  const { schedule } = state

  if (schedule.timezone.trim().length === 0) {
    issues[schedulePath("timezone")] = VALIDATION_KEY.timezoneRequired
  }

  if (schedule.kind === SCHEDULE_KIND.cron) {
    if (schedule.expression.trim().length === 0) {
      issues[schedulePath("expression")] = VALIDATION_KEY.expressionRequired
    }
    return issues
  }

  const seconds = Math.trunc(Number(schedule.intervalSeconds.trim()))
  if (!Number.isFinite(seconds) || seconds <= 0) {
    issues[schedulePath("intervalSeconds")] = VALIDATION_KEY.intervalInvalid
  } else if (seconds < MONITOR_DEFAULTS.minIntervalSeconds) {
    issues[schedulePath("intervalSeconds")] = VALIDATION_KEY.intervalTooShort
  }

  return issues
}

const validateExtractors = (state: MonitorFormState): FieldIssues => {
  const issues: Record<string, string> = {}

  if (state.extractors.length === 0) {
    issues[FIELD_PATH.extractors] = VALIDATION_KEY.extractorsRequired
    return issues
  }

  if (state.extractors.length > MONITOR_DEFAULTS.extractorsMax) {
    issues[FIELD_PATH.extractors] = VALIDATION_KEY.extractorsTooMany
  }

  const seen = new Set<string>()

  for (const [index, extractor] of state.extractors.entries()) {
    const key = extractor.key.trim()
    if (key.length === 0) {
      issues[extractorPath(index, "key")] = VALIDATION_KEY.keyRequired
    } else if (!EXTRACTOR_KEY_PATTERN.test(key)) {
      issues[extractorPath(index, "key")] = VALIDATION_KEY.keyInvalid
    } else if (seen.has(key)) {
      issues[extractorPath(index, "key")] = VALIDATION_KEY.keyDuplicate
    } else {
      seen.add(key)
    }

    if (extractor.label.trim().length === 0) {
      issues[extractorPath(index, "label")] = VALIDATION_KEY.labelRequired
    }

    if (extractor.selector.trim().length === 0) {
      issues[extractorPath(index, "selector")] = VALIDATION_KEY.selectorRequired
    }
  }

  return issues
}

const validateIgnoreRules = (state: MonitorFormState): FieldIssues => {
  const issues: Record<string, string> = {}

  for (const [index, rule] of state.ignoreRules.entries()) {
    if (rule.value.trim().length === 0) {
      issues[ignoreRulePath(index, "value")] = VALIDATION_KEY.ruleValueRequired
    }
  }

  return issues
}

export const validateMonitorForm = (state: MonitorFormState): FieldIssues => {
  const issues: Record<string, string> = {}

  const name = state.name.trim()
  if (name.length === 0) issues[FIELD_PATH.name] = VALIDATION_KEY.nameRequired
  else if (name.length > MONITOR_DEFAULTS.nameMaxLength) {
    issues[FIELD_PATH.name] = VALIDATION_KEY.nameTooLong
  }

  const url = state.url.trim()
  if (url.length === 0) issues[FIELD_PATH.url] = VALIDATION_KEY.urlRequired
  else if (!isValidUrl(url)) issues[FIELD_PATH.url] = VALIDATION_KEY.urlInvalid

  return {
    ...issues,
    ...validateSchedule(state),
    ...validateExtractors(state),
    ...validateIgnoreRules(state),
  }
}
