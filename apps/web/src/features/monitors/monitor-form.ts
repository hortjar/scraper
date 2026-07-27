import {
  IGNORE_RULE_KIND,
  MONITOR_DEFAULTS,
  MONITOR_ENGINE,
  OCCURRENCE,
  SCHEDULE_KIND,
  SELECTOR_KIND,
  TAG_SEPARATOR,
  TRANSFORM_KIND,
  VALUE_TYPE,
} from "./constants"
import { nextDraftId } from "./draft-id"
import { asCount, asText } from "./nullable"
import type { TransformValues } from "./transforms"
import type {
  IgnoreRuleKind,
  MonitorDetail,
  MonitorEngine,
  Occurrence,
  ScheduleKind,
  SelectorKind,
  TransformKind,
  ValueType,
} from "./types"

export interface TransformDraft {
  readonly id: string
  readonly kind: TransformKind
  readonly values: TransformValues
}

export interface ExtractorDraft {
  readonly id: string
  readonly key: string
  readonly label: string
  readonly selectorKind: SelectorKind
  readonly selector: string
  readonly attribute: string
  readonly valueType: ValueType
  readonly occurrence: Occurrence
  readonly occurrenceIndex: string
  readonly required: boolean
  readonly transforms: readonly TransformDraft[]
}

export interface IgnoreRuleDraft {
  readonly id: string
  readonly kind: IgnoreRuleKind
  readonly value: string
}

export interface ScheduleDraft {
  readonly kind: ScheduleKind
  readonly intervalSeconds: string
  readonly expression: string
  readonly timezone: string
}

export interface MonitorFormState {
  readonly name: string
  readonly url: string
  readonly engine: MonitorEngine
  readonly contentSelector: string
  readonly tags: string
  readonly enabled: boolean
  readonly respectRobots: boolean
  readonly schedule: ScheduleDraft
  readonly extractors: readonly ExtractorDraft[]
  readonly ignoreRules: readonly IgnoreRuleDraft[]
  readonly extractorsTouched: boolean
  readonly ignoreRulesTouched: boolean
}

const DEFAULT_CRON = "0 * * * *"

export const createTransformDraft = (
  kind: TransformKind = TRANSFORM_KIND.trim,
): TransformDraft => ({
  id: nextDraftId(),
  kind,
  values: {},
})

export const createExtractorDraft = (): ExtractorDraft => ({
  id: nextDraftId(),
  key: "",
  label: "",
  selectorKind: SELECTOR_KIND.css,
  selector: "",
  attribute: "",
  valueType: VALUE_TYPE.text,
  occurrence: OCCURRENCE.first,
  occurrenceIndex: "",
  required: false,
  transforms: [],
})

export const createIgnoreRuleDraft = (): IgnoreRuleDraft => ({
  id: nextDraftId(),
  kind: IGNORE_RULE_KIND.selector,
  value: "",
})

export const createScheduleDraft = (timezone: string): ScheduleDraft => ({
  kind: SCHEDULE_KIND.interval,
  intervalSeconds: String(MONITOR_DEFAULTS.intervalSeconds),
  expression: DEFAULT_CRON,
  timezone,
})

export const createMonitorFormState = (timezone: string): MonitorFormState => ({
  name: "",
  url: "",
  engine: MONITOR_ENGINE.auto,
  contentSelector: "",
  tags: "",
  enabled: true,
  respectRobots: true,
  schedule: createScheduleDraft(timezone),
  extractors: [createExtractorDraft()],
  ignoreRules: [],
  extractorsTouched: true,
  ignoreRulesTouched: true,
})

export const parseTags = (raw: string): readonly string[] =>
  [
    ...new Set(
      raw
        .split(TAG_SEPARATOR)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  ].slice(0, MONITOR_DEFAULTS.tagsMax)

export const formatTags = (tags: readonly string[]): string => tags.join(`${TAG_SEPARATOR} `)

const scheduleDraftFrom = (detail: MonitorDetail, timezone: string): ScheduleDraft =>
  detail.schedule.kind === SCHEDULE_KIND.cron
    ? {
        kind: SCHEDULE_KIND.cron,
        intervalSeconds: String(MONITOR_DEFAULTS.intervalSeconds),
        expression: detail.schedule.expression,
        timezone: detail.schedule.timezone,
      }
    : {
        kind: SCHEDULE_KIND.interval,
        intervalSeconds: String(detail.schedule.intervalSeconds),
        expression: DEFAULT_CRON,
        timezone: detail.schedule.timezone === "" ? timezone : detail.schedule.timezone,
      }

const extractorDraftFrom = (extractor: MonitorDetail["extractors"][number]): ExtractorDraft => {
  const occurrenceIndex = asCount(extractor.occurrenceIndex)

  return {
    id: extractor.id,
    key: extractor.key,
    label: extractor.label,
    selectorKind: extractor.selectorKind,
    selector: extractor.selector,
    attribute: asText(extractor.attribute) ?? "",
    valueType: extractor.valueType,
    occurrence: extractor.occurrence,
    occurrenceIndex: occurrenceIndex === undefined ? "" : String(occurrenceIndex),
    required: extractor.required,
    transforms: [],
  }
}

export const monitorFormStateFrom = (
  detail: MonitorDetail,
  timezone: string,
): MonitorFormState => ({
  name: detail.name,
  url: detail.url,
  engine: detail.engine,
  contentSelector: asText(detail.contentSelector) ?? "",
  tags: formatTags(detail.tags),
  enabled: detail.enabled,
  respectRobots: detail.respectRobots,
  schedule: scheduleDraftFrom(detail, timezone),
  extractors: detail.extractors.map((extractor) => extractorDraftFrom(extractor)),
  ignoreRules: [],
  extractorsTouched: false,
  ignoreRulesTouched: false,
})
