import { describe, expect, it } from "vitest"

import {
  asDiffHunks,
  toChangeSummary,
  toRunDetail,
  toRunFieldValue,
  toRunSummary,
} from "./transforms"
import type { ChangeListItem, RunDetailResponse, RunFieldValueResponse, RunListItem } from "./types"

const runItem: RunListItem = {
  id: "run-1",
  monitorId: "monitor-1",
  trigger: "schedule",
  status: "failed",
  strategyUsed: "http",
  startedAt: "2026-07-27T10:00:00.000Z",
  finishedAt: "2026-07-27T10:00:02.000Z",
  durationMs: 2000,
  httpStatus: 503,
  bytes: null,
  changed: false,
  errorKind: "browser_unavailable",
  errorMessage: "The browser pool is unavailable.",
  attempt: 1,
}

describe("toRunSummary", () => {
  it("narrows nullable fields typed as unknown by the generated client", () => {
    expect(toRunSummary(runItem)).toStrictEqual({
      id: "run-1",
      monitorId: "monitor-1",
      trigger: "schedule",
      status: "failed",
      strategyUsed: "http",
      startedAt: "2026-07-27T10:00:00.000Z",
      finishedAt: "2026-07-27T10:00:02.000Z",
      durationMs: 2000,
      httpStatus: 503,
      bytes: null,
      changed: false,
      errorKind: "browser_unavailable",
      errorMessage: "The browser pool is unavailable.",
      attempt: 1,
    })
  })

  it("drops values of the wrong runtime type instead of trusting the static type", () => {
    const malformed: RunListItem = { ...runItem, durationMs: "not-a-number", bytes: NaN }
    const summary = toRunSummary(malformed)
    expect(summary.durationMs).toBeNull()
    expect(summary.bytes).toBeNull()
  })
})

describe("toRunFieldValue and toRunDetail", () => {
  const field: RunFieldValueResponse = {
    extractorKey: "price",
    raw: "$12.00",
    valueText: null,
    valueNumber: 12,
    valueBool: null,
    valueList: null,
    missing: false,
  }

  it("narrows a field value", () => {
    expect(toRunFieldValue(field)).toStrictEqual({
      extractorKey: "price",
      raw: "$12.00",
      valueText: null,
      valueNumber: 12,
      valueBool: null,
      valueList: null,
      missing: false,
    })
  })

  it("rejects a list value that is not made of strings", () => {
    const malformed: RunFieldValueResponse = { ...field, valueList: [1, 2, 3] }
    expect(toRunFieldValue(malformed).valueList).toBeNull()
  })

  it("attaches parsed fields to the run summary", () => {
    const detail: RunDetailResponse = { ...runItem, fields: [field] }
    expect(toRunDetail(detail).fields).toHaveLength(1)
  })
})

describe("asDiffHunks", () => {
  it("returns null when the value is not an array", () => {
    expect(asDiffHunks(null)).toBeNull()
    expect(asDiffHunks("not-an-array")).toBeNull()
  })

  it("keeps well-formed hunks and drops malformed entries", () => {
    const raw = [
      { kind: "unchanged", value: "context" },
      { kind: "removed", value: "$129.00" },
      { kind: "added", value: "$99.00" },
      { kind: "bogus", value: "dropped" },
      { kind: "added", value: 42 },
      "not-an-object",
    ]

    expect(asDiffHunks(raw)).toStrictEqual([
      { kind: "unchanged", value: "context" },
      { kind: "removed", value: "$129.00" },
      { kind: "added", value: "$99.00" },
    ])
  })
})

describe("toChangeSummary", () => {
  const change: ChangeListItem = {
    id: "change-1",
    monitorId: "monitor-1",
    runId: "run-1",
    previousRunId: "run-0",
    extractorKey: "price",
    changeKind: "decreased",
    oldValue: "129",
    newValue: "99",
    oldNumber: 129,
    newNumber: 99,
    deltaAbsolute: -30,
    deltaPercent: -23.26,
    diff: [{ kind: "removed", value: "129" }],
    createdAt: "2026-07-27T10:00:02.000Z",
  }

  it("narrows a change response into a ChangeSummary", () => {
    expect(toChangeSummary(change)).toStrictEqual({
      id: "change-1",
      monitorId: "monitor-1",
      runId: "run-1",
      previousRunId: "run-0",
      extractorKey: "price",
      changeKind: "decreased",
      oldValue: "129",
      newValue: "99",
      oldNumber: 129,
      newNumber: 99,
      deltaAbsolute: -30,
      deltaPercent: -23.26,
      diff: [{ kind: "removed", value: "129" }],
      createdAt: "2026-07-27T10:00:02.000Z",
    })
  })

  it("treats a whole-page change (null extractorKey) as null, not the string 'null'", () => {
    const wholePage: ChangeListItem = { ...change, extractorKey: null }
    expect(toChangeSummary(wholePage).extractorKey).toBeNull()
  })
})
