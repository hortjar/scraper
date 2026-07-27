import {
  type ExtractorDraft,
  type IgnoreRuleDraft,
  type MonitorFormState,
  type ScheduleDraft,
  type TransformDraft,
  createExtractorDraft,
  createIgnoreRuleDraft,
  createTransformDraft,
} from "./monitor-form"
import type { MonitorEngine, ScheduleKind } from "./types"

export const FORM_ACTION = {
  field: "field",
  flag: "flag",
  engine: "engine",
  schedule: "schedule",
  extractors: "extractors",
  ignoreRules: "ignoreRules",
} as const

export const SCHEDULE_ACTION = { kind: "kind", field: "field" } as const

export const EXTRACTOR_ACTION = {
  add: "add",
  remove: "remove",
  move: "move",
  update: "update",
  addTransform: "addTransform",
  removeTransform: "removeTransform",
  updateTransform: "updateTransform",
} as const

export const IGNORE_RULE_ACTION = { add: "add", remove: "remove", update: "update" } as const

export type TextField = "name" | "url" | "contentSelector" | "tags"
export type FlagField = "enabled" | "respectRobots"
export type ScheduleField = "intervalSeconds" | "expression" | "timezone"

export type ScheduleAction =
  | { readonly type: typeof SCHEDULE_ACTION.kind; readonly value: ScheduleKind }
  | {
      readonly type: typeof SCHEDULE_ACTION.field
      readonly field: ScheduleField
      readonly value: string
    }

export type ExtractorsAction =
  | { readonly type: typeof EXTRACTOR_ACTION.add }
  | { readonly type: typeof EXTRACTOR_ACTION.remove; readonly id: string }
  | { readonly type: typeof EXTRACTOR_ACTION.move; readonly id: string; readonly offset: number }
  | {
      readonly type: typeof EXTRACTOR_ACTION.update
      readonly id: string
      readonly patch: Partial<ExtractorDraft>
    }
  | { readonly type: typeof EXTRACTOR_ACTION.addTransform; readonly id: string }
  | {
      readonly type: typeof EXTRACTOR_ACTION.removeTransform
      readonly id: string
      readonly transformId: string
    }
  | {
      readonly type: typeof EXTRACTOR_ACTION.updateTransform
      readonly id: string
      readonly transformId: string
      readonly patch: Partial<TransformDraft>
    }

export type IgnoreRulesAction =
  | { readonly type: typeof IGNORE_RULE_ACTION.add }
  | { readonly type: typeof IGNORE_RULE_ACTION.remove; readonly id: string }
  | {
      readonly type: typeof IGNORE_RULE_ACTION.update
      readonly id: string
      readonly patch: Partial<IgnoreRuleDraft>
    }

export type MonitorFormAction =
  | { readonly type: typeof FORM_ACTION.field; readonly field: TextField; readonly value: string }
  | { readonly type: typeof FORM_ACTION.flag; readonly field: FlagField; readonly value: boolean }
  | { readonly type: typeof FORM_ACTION.engine; readonly value: MonitorEngine }
  | { readonly type: typeof FORM_ACTION.schedule; readonly action: ScheduleAction }
  | { readonly type: typeof FORM_ACTION.extractors; readonly action: ExtractorsAction }
  | { readonly type: typeof FORM_ACTION.ignoreRules; readonly action: IgnoreRulesAction }

const patchById = <T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
  patch: Partial<T>,
): readonly T[] => items.map((item) => (item.id === id ? { ...item, ...patch } : item))

const moveById = <T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
  offset: number,
): readonly T[] => {
  const index = items.findIndex((item) => item.id === id)
  const target = index + offset
  if (index === -1 || target < 0 || target >= items.length) return items

  const next = [...items]
  const source = next[index]
  const destination = next[target]
  if (source === undefined || destination === undefined) return items

  next[index] = destination
  next[target] = source
  return next
}

const scheduleReducer = (state: ScheduleDraft, action: ScheduleAction): ScheduleDraft => {
  switch (action.type) {
    case SCHEDULE_ACTION.kind: {
      return { ...state, kind: action.value }
    }
    case SCHEDULE_ACTION.field: {
      return { ...state, [action.field]: action.value }
    }
  }
}

type TransformAction = Extract<
  ExtractorsAction,
  {
    readonly type:
      | typeof EXTRACTOR_ACTION.addTransform
      | typeof EXTRACTOR_ACTION.removeTransform
      | typeof EXTRACTOR_ACTION.updateTransform
  }
>

const transformsReducer = (
  extractor: ExtractorDraft,
  action: TransformAction,
): readonly TransformDraft[] => {
  switch (action.type) {
    case EXTRACTOR_ACTION.addTransform: {
      return [...extractor.transforms, createTransformDraft()]
    }
    case EXTRACTOR_ACTION.removeTransform: {
      return extractor.transforms.filter((transform) => transform.id !== action.transformId)
    }
    case EXTRACTOR_ACTION.updateTransform: {
      return patchById(extractor.transforms, action.transformId, action.patch)
    }
  }
}

const withTransforms = (
  extractors: readonly ExtractorDraft[],
  action: TransformAction,
): readonly ExtractorDraft[] =>
  extractors.map((extractor) =>
    extractor.id === action.id
      ? { ...extractor, transforms: transformsReducer(extractor, action) }
      : extractor,
  )

const extractorsReducer = (
  state: readonly ExtractorDraft[],
  action: ExtractorsAction,
): readonly ExtractorDraft[] => {
  switch (action.type) {
    case EXTRACTOR_ACTION.add: {
      return [...state, createExtractorDraft()]
    }
    case EXTRACTOR_ACTION.remove: {
      return state.filter((extractor) => extractor.id !== action.id)
    }
    case EXTRACTOR_ACTION.move: {
      return moveById(state, action.id, action.offset)
    }
    case EXTRACTOR_ACTION.update: {
      return patchById(state, action.id, action.patch)
    }
    case EXTRACTOR_ACTION.addTransform:
    case EXTRACTOR_ACTION.removeTransform:
    case EXTRACTOR_ACTION.updateTransform: {
      return withTransforms(state, action)
    }
  }
}

const ignoreRulesReducer = (
  state: readonly IgnoreRuleDraft[],
  action: IgnoreRulesAction,
): readonly IgnoreRuleDraft[] => {
  switch (action.type) {
    case IGNORE_RULE_ACTION.add: {
      return [...state, createIgnoreRuleDraft()]
    }
    case IGNORE_RULE_ACTION.remove: {
      return state.filter((rule) => rule.id !== action.id)
    }
    case IGNORE_RULE_ACTION.update: {
      return patchById(state, action.id, action.patch)
    }
  }
}

export const monitorFormReducer = (
  state: MonitorFormState,
  action: MonitorFormAction,
): MonitorFormState => {
  switch (action.type) {
    case FORM_ACTION.field: {
      return { ...state, [action.field]: action.value }
    }
    case FORM_ACTION.flag: {
      return { ...state, [action.field]: action.value }
    }
    case FORM_ACTION.engine: {
      return { ...state, engine: action.value }
    }
    case FORM_ACTION.schedule: {
      return { ...state, schedule: scheduleReducer(state.schedule, action.action) }
    }
    case FORM_ACTION.extractors: {
      return {
        ...state,
        extractors: extractorsReducer(state.extractors, action.action),
        extractorsTouched: true,
      }
    }
    case FORM_ACTION.ignoreRules: {
      return {
        ...state,
        ignoreRules: ignoreRulesReducer(state.ignoreRules, action.action),
        ignoreRulesTouched: true,
      }
    }
  }
}
