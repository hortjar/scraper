import { MONITOR_STATUS } from "@scraper/core/constants"
import type { MonitorStatus } from "@scraper/core/domain"

export interface RunOutcomeInput {
  readonly consecutiveFailures: number
  readonly failed: boolean
  readonly operatorFault: boolean
  readonly autoPauseAfterFailures: number
}

export interface MonitorState {
  readonly status: MonitorStatus
  readonly consecutiveFailures: number
  readonly enabled: boolean | null
}

export const nextMonitorState = (input: RunOutcomeInput): MonitorState => {
  if (!input.failed) {
    return { status: MONITOR_STATUS.ok, consecutiveFailures: 0, enabled: null }
  }

  const consecutiveFailures = input.consecutiveFailures + 1
  if (input.operatorFault) {
    return { status: MONITOR_STATUS.degraded, consecutiveFailures, enabled: null }
  }
  if (consecutiveFailures >= input.autoPauseAfterFailures) {
    return { status: MONITOR_STATUS.paused, consecutiveFailures, enabled: false }
  }
  return { status: MONITOR_STATUS.failing, consecutiveFailures, enabled: null }
}
