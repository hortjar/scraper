import { CHANGE_KIND, TRIGGER_KIND } from "@scraper/core/constants"
import type { ExtractorKey, TriggerConfig } from "@scraper/core/domain"
import { describe, expect, it } from "vitest"

import type { ChangeDraft } from "../diff/field-diff.js"

import { matchTrigger } from "./trigger-match.js"
import type { TriggerContext } from "./trigger-match.js"

const PRICE = "price" as ExtractorKey
const TITLE = "title" as ExtractorKey
const NOW = new Date("2026-07-27T12:00:00Z")

const change = (fields: Partial<ChangeDraft>): ChangeDraft => ({
  extractorKey: PRICE,
  changeKind: CHANGE_KIND.modified,
  oldValue: null,
  newValue: null,
  oldNumber: null,
  newNumber: null,
  deltaAbsolute: null,
  deltaPercent: null,
  diff: null,
  ...fields,
})

const context = (fields: Partial<TriggerContext>): TriggerContext => ({
  changes: [],
  runFailed: false,
  previousRunFailed: false,
  lastChangeAt: null,
  now: NOW,
  ...fields,
})

const match = (
  trigger: TriggerConfig,
  context_: TriggerContext,
  key: ExtractorKey | null = PRICE,
) => matchTrigger(trigger, key, context_)

describe("any_change", () => {
  const trigger = { kind: TRIGGER_KIND.anyChange } as const

  it("fires on any change regardless of the rule's extractor", () => {
    const context_ = context({ changes: [change({ extractorKey: TITLE })] })

    expect(match(trigger, context_)).toHaveLength(1)
  })

  it("does not fire when there are no changes", () => {
    expect(match(trigger, context({}))).toBeNull()
  })
})

describe("field_changed", () => {
  const trigger = { kind: TRIGGER_KIND.fieldChanged } as const

  it("fires only for its own extractor", () => {
    const context_ = context({ changes: [change({ extractorKey: TITLE })] })

    expect(match(trigger, context_)).toBeNull()
    expect(match(trigger, context_, TITLE)).toHaveLength(1)
  })
})

describe("numeric_threshold", () => {
  it("fires when the new value satisfies the operator", () => {
    const context_ = context({ changes: [change({ newNumber: 90 })] })

    expect(
      match({ kind: TRIGGER_KIND.numericThreshold, operator: "lt", value: 100 }, context_),
    ).toHaveLength(1)
    expect(
      match({ kind: TRIGGER_KIND.numericThreshold, operator: "gt", value: 100 }, context_),
    ).toBeNull()
  })

  it("ignores a change carrying no number", () => {
    const context_ = context({ changes: [change({ newValue: "cheap" })] })

    expect(
      match({ kind: TRIGGER_KIND.numericThreshold, operator: "lt", value: 100 }, context_),
    ).toBeNull()
  })
})

describe("percent_change", () => {
  it("respects the direction", () => {
    const drop = context({ changes: [change({ deltaPercent: -30 })] })

    expect(
      match({ kind: TRIGGER_KIND.percentChange, direction: "down", percent: 20 }, drop),
    ).toHaveLength(1)
    expect(
      match({ kind: TRIGGER_KIND.percentChange, direction: "up", percent: 20 }, drop),
    ).toBeNull()
    expect(
      match({ kind: TRIGGER_KIND.percentChange, direction: "any", percent: 20 }, drop),
    ).toHaveLength(1)
  })

  it("does not fire below the threshold", () => {
    const small = context({ changes: [change({ deltaPercent: -5 })] })

    expect(
      match({ kind: TRIGGER_KIND.percentChange, direction: "any", percent: 20 }, small),
    ).toBeNull()
  })
})

describe("text triggers", () => {
  const context_ = context({ changes: [change({ newValue: "Back In Stock" })] })

  it("matches case-insensitively by default", () => {
    expect(
      match({ kind: TRIGGER_KIND.textContains, text: "in stock", caseSensitive: false }, context_),
    ).toHaveLength(1)
    expect(
      match({ kind: TRIGGER_KIND.textContains, text: "in stock", caseSensitive: true }, context_),
    ).toBeNull()
  })

  it("inverts for text_not_contains", () => {
    expect(
      match(
        { kind: TRIGGER_KIND.textNotContains, text: "sold out", caseSensitive: false },
        context_,
      ),
    ).toHaveLength(1)
  })

  it("applies a regular expression", () => {
    expect(match({ kind: TRIGGER_KIND.regexMatch, pattern: "^Back" }, context_)).toHaveLength(1)
    expect(match({ kind: TRIGGER_KIND.regexMatch, pattern: "^Gone" }, context_)).toBeNull()
  })
})

describe("availability", () => {
  const appeared = context({ changes: [change({ changeKind: CHANGE_KIND.appeared })] })

  it("distinguishes appeared from disappeared", () => {
    expect(match({ kind: TRIGGER_KIND.availability, expect: "available" }, appeared)).toHaveLength(
      1,
    )
    expect(match({ kind: TRIGGER_KIND.availability, expect: "unavailable" }, appeared)).toBeNull()
    expect(match({ kind: TRIGGER_KIND.availability, expect: "any" }, appeared)).toHaveLength(1)
  })

  it("ignores a modification", () => {
    const modified = context({ changes: [change({ changeKind: CHANGE_KIND.modified })] })

    expect(match({ kind: TRIGGER_KIND.availability, expect: "any" }, modified)).toBeNull()
  })
})

describe("run-level triggers", () => {
  it("fires run_failed only on a failed run", () => {
    expect(match({ kind: TRIGGER_KIND.runFailed }, context({ runFailed: true }))).toEqual([])
    expect(match({ kind: TRIGGER_KIND.runFailed }, context({}))).toBeNull()
  })

  it("fires run_recovered only when the previous run failed and this one did not", () => {
    expect(
      match({ kind: TRIGGER_KIND.runRecovered }, context({ previousRunFailed: true })),
    ).toEqual([])
    expect(match({ kind: TRIGGER_KIND.runRecovered }, context({}))).toBeNull()
    expect(
      match(
        { kind: TRIGGER_KIND.runRecovered },
        context({ previousRunFailed: true, runFailed: true }),
      ),
    ).toBeNull()
  })

  it("fires no_change_for once the silence exceeds the window", () => {
    const stale = context({ lastChangeAt: new Date("2026-07-26T00:00:00Z") })
    const fresh = context({ lastChangeAt: new Date("2026-07-27T11:00:00Z") })

    expect(match({ kind: TRIGGER_KIND.noChangeFor, hours: 24 }, stale)).toEqual([])
    expect(match({ kind: TRIGGER_KIND.noChangeFor, hours: 24 }, fresh)).toBeNull()
  })

  it("never fires no_change_for on a monitor that has never changed", () => {
    expect(match({ kind: TRIGGER_KIND.noChangeFor, hours: 1 }, context({}))).toBeNull()
  })
})

describe("a failed run", () => {
  it("suppresses every change-based trigger, so a failure is not reported as a change", () => {
    const context_ = context({ runFailed: true, changes: [change({ newValue: "anything" })] })

    expect(match({ kind: TRIGGER_KIND.anyChange }, context_)).toBeNull()
    expect(match({ kind: TRIGGER_KIND.fieldChanged }, context_)).toBeNull()
  })
})
