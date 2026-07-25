import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useInterval } from "./use-interval"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useInterval", () => {
  it("calls the callback on every tick", () => {
    const spy = vi.fn()
    renderHook(() => {
      useInterval(spy, 1000)
    })

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it("does not schedule anything when the delay is null", () => {
    const spy = vi.fn()
    renderHook(() => {
      useInterval(spy, null)
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(spy).not.toHaveBeenCalled()
  })

  it("always calls the latest callback without resubscribing", () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ callback }) => {
        useInterval(callback, 1000)
      },
      {
        initialProps: { callback: first },
      },
    )

    rerender({ callback: second })
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it("stops on unmount", () => {
    const spy = vi.fn()
    const { unmount } = renderHook(() => {
      useInterval(spy, 1000)
    })

    unmount()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(spy).not.toHaveBeenCalled()
  })
})
