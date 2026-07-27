import type { GetRunResponse, ListChangesResponse, ListRunsResponse } from "../../api"

export type RunListPage = ListRunsResponse
export type RunListItem = RunListPage["items"][number]
export type RunStatus = RunListItem["status"]
export type RunTrigger = RunListItem["trigger"]

export type ChangeListPage = ListChangesResponse
export type ChangeListItem = ChangeListPage["items"][number]
export type ChangeKind = ChangeListItem["changeKind"]

export type RunDetailResponse = GetRunResponse
export type RunFieldValueResponse = RunDetailResponse["fields"][number]

export interface DiffHunk {
  readonly kind: "added" | "removed" | "unchanged"
  readonly value: string
}

export type DiffHunkKind = DiffHunk["kind"]

export interface RunSummary {
  readonly id: string
  readonly monitorId: string
  readonly trigger: RunTrigger
  readonly status: RunStatus
  readonly strategyUsed: string | null
  readonly startedAt: string
  readonly finishedAt: string | null
  readonly durationMs: number | null
  readonly httpStatus: number | null
  readonly bytes: number | null
  readonly changed: boolean
  readonly errorKind: string | null
  readonly errorMessage: string | null
  readonly attempt: number
}

export interface RunFieldValue {
  readonly extractorKey: string
  readonly raw: string | null
  readonly valueText: string | null
  readonly valueNumber: number | null
  readonly valueBool: boolean | null
  readonly valueList: readonly string[] | null
  readonly missing: boolean
}

export interface RunDetail extends RunSummary {
  readonly fields: readonly RunFieldValue[]
}

export interface ChangeSummary {
  readonly id: string
  readonly monitorId: string
  readonly runId: string
  readonly previousRunId: string | null
  readonly extractorKey: string | null
  readonly changeKind: ChangeKind
  readonly oldValue: string | null
  readonly newValue: string | null
  readonly oldNumber: number | null
  readonly newNumber: number | null
  readonly deltaAbsolute: number | null
  readonly deltaPercent: number | null
  readonly diff: readonly DiffHunk[] | null
  readonly createdAt: string
}
