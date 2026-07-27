import type { MonitorId, RunStatus, RunTrigger, StrategyKind } from "@scraper/core/domain"

export interface StartRunInput {
  readonly monitorId: MonitorId
  readonly trigger: RunTrigger
  readonly jobId: string | null
  readonly attempt: number
  readonly startedAt: Date
}

export interface FinishRunInput {
  readonly status: RunStatus
  readonly finishedAt: Date
  readonly durationMs: number
  readonly changed: boolean
  readonly strategyUsed?: StrategyKind | undefined
  readonly httpStatus?: number | undefined
  readonly bytes?: number | undefined
  readonly contentHash?: string | undefined
  readonly errorKind?: string | undefined
  readonly errorMessage?: string | undefined
}

export interface FieldValueInput {
  readonly extractorKey: string
  readonly raw: string | null
  readonly valueText: string | null
  readonly valueNumber: number | null
  readonly valueBool: boolean | null
  readonly valueList: readonly string[] | null
  readonly missing: boolean
}

export interface RunListFilter {
  readonly cursor?: string | undefined
  readonly limit: number
}
