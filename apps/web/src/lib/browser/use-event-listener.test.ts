import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useEventListener } from "./use-event-listener"

describe("useEventListener", () => {
  it("listens on window by default", () => {
    const spy = vi.fn()
    renderHook(() => useEventListener("resize", spy))

    act(() => void window.dispatchEvent(new Event("resize")))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("listens on an explicit target", () => {
    const spy = vi.fn()
    const node = document.createElement("button")
    renderHook(() => useEventListener("click", spy, node))

    act(() => void node.dispatchEvent(new Event("click")))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("ignores a null target", () => {
    const spy = vi.fn()
    renderHook(() => useEventListener("click", spy, null))

    act(() => void window.dispatchEvent(new Event("click")))
    expect(spy).not.toHaveBeenCalled()
  })

  it("removes the listener on unmount", () => {
    const spy = vi.fn()
    const { unmount } = renderHook(() => useEventListener("resize", spy))

    unmount()
    act(() => void window.dispatchEvent(new Event("resize")))
    expect(spy).not.toHaveBeenCalled()
  })
})
