import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { setOnline } from "../../test/browser-stubs"

import { useIsOnline } from "./use-online-status"

afterEach(() => {
  setOnline(true)
})

describe("useIsOnline", () => {
  it("starts from navigator.onLine", () => {
    const { result } = renderHook(() => useIsOnline())
    expect(result.current).toBe(true)
  })

  it("follows offline and online events", () => {
    const { result } = renderHook(() => useIsOnline())

    act(() => {
      setOnline(false)
    })
    expect(result.current).toBe(false)

    act(() => {
      setOnline(true)
    })
    expect(result.current).toBe(true)
  })
})
