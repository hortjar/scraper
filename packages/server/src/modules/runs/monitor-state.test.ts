import { describe, expect, it } from "vitest"

import { nextMonitorState } from "./monitor-state.js"
import type { RunOutcomeInput } from "./monitor-state.js"

const input = (fields: Partial<RunOutcomeInput>): RunOutcomeInput => ({
  consecutiveFailures: 0,
  failed: false,
  operatorFault: false,
  autoPauseAfterFailures: 20,
  ...fields,
})

describe("nextMonitorState", () => {
  it("clears the failure streak on success", () => {
    const state = nextMonitorState(input({ consecutiveFailures: 7 }))

    expect(state).toEqual({ status: "ok", consecutiveFailures: 0, enabled: null })
  })

  it("marks a monitor failing and counts the failure", () => {
    const state = nextMonitorState(input({ failed: true, consecutiveFailures: 2 }))

    expect(state.status).toBe("failing")
    expect(state.consecutiveFailures).toBe(3)
    expect(state.enabled).toBeNull()
  })

  it("auto-pauses at the limit and disables the monitor", () => {
    const state = nextMonitorState(
      input({ failed: true, consecutiveFailures: 19, autoPauseAfterFailures: 20 }),
    )

    expect(state.status).toBe("paused")
    expect(state.enabled).toBe(false)
  })

  it("reports an operator fault as degraded and never auto-pauses for it", () => {
    const state = nextMonitorState(
      input({
        failed: true,
        operatorFault: true,
        consecutiveFailures: 99,
        autoPauseAfterFailures: 20,
      }),
    )

    expect(state.status).toBe("degraded")
    expect(state.enabled).toBeNull()
  })
})
