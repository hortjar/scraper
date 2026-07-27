import { beforeEach, describe, expect, it } from "vitest"

import {
  MONITOR_ENGINE,
  OCCURRENCE,
  SCHEDULE_KIND,
  SELECTOR_KIND,
  TRANSFORM_KIND,
  VALUE_TYPE,
} from "./constants"
import { resetDraftIds } from "./draft-id"
import {
  type MonitorFormState,
  createExtractorDraft,
  createIgnoreRuleDraft,
  createMonitorFormState,
  createTransformDraft,
} from "./monitor-form"
import {
  toCreateBody,
  toExtractorPayload,
  toSchedulePayload,
  toUpdateBody,
} from "./monitor-payload"
import { TRANSFORM_FIELD } from "./transforms"

const TIMEZONE = "Europe/Prague"

const baseState = (): MonitorFormState => ({
  ...createMonitorFormState(TIMEZONE),
  name: "  Pricing page  ",
  url: "  https://example.com/pricing  ",
})

const withExtractor = (
  state: MonitorFormState,
  extractor: Partial<ReturnType<typeof createExtractorDraft>>,
): MonitorFormState => ({
  ...state,
  extractors: [{ ...createExtractorDraft(), ...extractor }],
})

describe("toSchedulePayload", () => {
  it("emits an interval schedule with a parsed integer", () => {
    expect(
      toSchedulePayload({
        kind: SCHEDULE_KIND.interval,
        intervalSeconds: " 900 ",
        expression: "0 * * * *",
        timezone: TIMEZONE,
      }),
    ).toStrictEqual({
      kind: SCHEDULE_KIND.interval,
      intervalSeconds: 900,
      timezone: TIMEZONE,
    })
  })

  it("falls back to the default when the interval is not a number", () => {
    const payload = toSchedulePayload({
      kind: SCHEDULE_KIND.interval,
      intervalSeconds: "not-a-number",
      expression: "0 * * * *",
      timezone: TIMEZONE,
    })

    expect(payload).toStrictEqual({
      kind: SCHEDULE_KIND.interval,
      intervalSeconds: 3600,
      timezone: TIMEZONE,
    })
  })

  it("emits a cron schedule and drops the interval branch entirely", () => {
    const payload = toSchedulePayload({
      kind: SCHEDULE_KIND.cron,
      intervalSeconds: "900",
      expression: "  0 9 * * 1  ",
      timezone: TIMEZONE,
    })

    expect(payload).toStrictEqual({
      kind: SCHEDULE_KIND.cron,
      expression: "0 9 * * 1",
      timezone: TIMEZONE,
    })
    expect(payload).not.toHaveProperty("intervalSeconds")
  })
})

describe("toExtractorPayload", () => {
  beforeEach(() => {
    resetDraftIds()
  })

  it("trims text fields and omits empty optional ones", () => {
    const payload = toExtractorPayload({
      ...createExtractorDraft(),
      key: " price ",
      label: " Price ",
      selector: " .price ",
      attribute: " ".repeat(3),
      occurrenceIndex: "",
    })

    expect(payload.key).toBe("price")
    expect(payload.label).toBe("Price")
    expect(payload.selector).toBe(".price")
    expect(payload).not.toHaveProperty("attribute")
    expect(payload).not.toHaveProperty("occurrenceIndex")
    expect(payload).not.toHaveProperty("transforms")
  })

  it("keeps occurrenceIndex only for the nth occurrence", () => {
    const nth = toExtractorPayload({
      ...createExtractorDraft(),
      occurrence: OCCURRENCE.nth,
      occurrenceIndex: "2",
    })
    const first = toExtractorPayload({
      ...createExtractorDraft(),
      occurrence: OCCURRENCE.first,
      occurrenceIndex: "2",
    })

    expect(nth).toHaveProperty("occurrenceIndex", 2)
    expect(first).not.toHaveProperty("occurrenceIndex")
  })

  it("maps transform drafts through their builders", () => {
    const payload = toExtractorPayload({
      ...createExtractorDraft(),
      transforms: [
        { ...createTransformDraft(TRANSFORM_KIND.trim), values: {} },
        {
          ...createTransformDraft(TRANSFORM_KIND.regexExtract),
          values: { [TRANSFORM_FIELD.pattern]: String.raw`(\d+)`, [TRANSFORM_FIELD.group]: "1" },
        },
        {
          ...createTransformDraft(TRANSFORM_KIND.mapValues),
          values: { [TRANSFORM_FIELD.mapping]: "in stock=yes\nout of stock=no" },
        },
      ],
    })

    expect(payload.transforms).toStrictEqual([
      { kind: TRANSFORM_KIND.trim },
      { kind: TRANSFORM_KIND.regexExtract, pattern: String.raw`(\d+)`, group: 1 },
      {
        kind: TRANSFORM_KIND.mapValues,
        mapping: { "in stock": "yes", "out of stock": "no" },
      },
    ])
  })
})

describe("toCreateBody", () => {
  beforeEach(() => {
    resetDraftIds()
  })

  it("trims the name and url and parses tags", () => {
    const body = toCreateBody({ ...baseState(), tags: " pricing , competitors ,, pricing " })

    expect(body.name).toBe("Pricing page")
    expect(body.url).toBe("https://example.com/pricing")
    expect(body.tags).toStrictEqual(["pricing", "competitors"])
  })

  it("sends a null contentSelector when the field is blank", () => {
    expect(
      toCreateBody({ ...baseState(), contentSelector: " ".repeat(3) }).contentSelector,
    ).toBeNull()
    expect(toCreateBody({ ...baseState(), contentSelector: " main " }).contentSelector).toBe("main")
  })

  it("always includes extractors and ignoreRules", () => {
    const body = toCreateBody(baseState())

    expect(body.extractors).toBeDefined()
    expect(body.ignoreRules).toStrictEqual([])
  })

  it("drops ignore rules whose value is blank", () => {
    const body = toCreateBody({
      ...baseState(),
      ignoreRules: [
        { ...createIgnoreRuleDraft(), value: " .advert " },
        { ...createIgnoreRuleDraft(), value: "  " },
      ],
    })

    expect(body.ignoreRules).toStrictEqual([{ kind: "selector", value: ".advert" }])
  })

  it("carries the engine and flags through unchanged", () => {
    const body = toCreateBody({
      ...baseState(),
      engine: MONITOR_ENGINE.browser,
      enabled: false,
      respectRobots: false,
    })

    expect(body.engine).toBe(MONITOR_ENGINE.browser)
    expect(body.enabled).toBe(false)
    expect(body.respectRobots).toBe(false)
  })
})

describe("toUpdateBody", () => {
  beforeEach(() => {
    resetDraftIds()
  })

  it("omits extractors and ignoreRules until they are edited", () => {
    const body = toUpdateBody({
      ...baseState(),
      extractorsTouched: false,
      ignoreRulesTouched: false,
    })

    expect(body).not.toHaveProperty("extractors")
    expect(body).not.toHaveProperty("ignoreRules")
    expect(body.name).toBe("Pricing page")
  })

  it("includes extractors once they have been edited", () => {
    const state = withExtractor(baseState(), {
      key: "price",
      label: "Price",
      selector: ".price",
      selectorKind: SELECTOR_KIND.css,
      valueType: VALUE_TYPE.price,
    })

    const body = toUpdateBody({ ...state, extractorsTouched: true, ignoreRulesTouched: false })

    expect(body.extractors).toStrictEqual([
      {
        key: "price",
        label: "Price",
        selector: ".price",
        selectorKind: SELECTOR_KIND.css,
        valueType: VALUE_TYPE.price,
        occurrence: OCCURRENCE.first,
        required: false,
      },
    ])
    expect(body).not.toHaveProperty("ignoreRules")
  })

  it("includes ignoreRules once they have been edited", () => {
    const body = toUpdateBody({
      ...baseState(),
      ignoreRules: [{ ...createIgnoreRuleDraft(), value: ".advert" }],
      extractorsTouched: false,
      ignoreRulesTouched: true,
    })

    expect(body.ignoreRules).toStrictEqual([{ kind: "selector", value: ".advert" }])
    expect(body).not.toHaveProperty("extractors")
  })
})
