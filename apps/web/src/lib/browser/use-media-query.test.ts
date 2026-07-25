import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { setMediaQuery } from "../../test/browser-stubs"

import { PREFERS_REDUCED_MOTION, useIsMediaQuery, useIsReducedMotion } from "./use-media-query"

const QUERY = "(min-width: 900px)"

describe("useIsMediaQuery", () => {
  it("reports the current match", () => {
    setMediaQuery(QUERY, true)
    const { result } = renderHook(() => useIsMediaQuery(QUERY))
    expect(result.current).toBe(true)
  })

  it("re-renders when the query changes", () => {
    setMediaQuery(QUERY, false)
    const { result } = renderHook(() => useIsMediaQuery(QUERY))
    expect(result.current).toBe(false)

    act(() => {
      setMediaQuery(QUERY, true)
    })
    expect(result.current).toBe(true)
  })

  it("exposes a reduced-motion helper", () => {
    setMediaQuery(PREFERS_REDUCED_MOTION, true)
    const { result } = renderHook(() => useIsReducedMotion())
    expect(result.current).toBe(true)
  })
})
