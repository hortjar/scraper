import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { setOnline } from "../../test/setup"

import { useOnlineStatus } from "./use-online-status"

afterEach(() => setOnline(true))

describe("useOnlineStatus", () => {
  it("starts from navigator.onLine", () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it("follows offline and online events", () => {
    const { result } = renderHook(() => useOnlineStatus())

    act(() => setOnline(false))
    expect(result.current).toBe(false)

    act(() => setOnline(true))
    expect(result.current).toBe(true)
  })
})
