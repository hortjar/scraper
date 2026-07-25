import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { setMediaQuery } from "../../test/setup"

import { PREFERS_REDUCED_MOTION, useMediaQuery, usePrefersReducedMotion } from "./use-media-query"

const QUERY = "(min-width: 900px)"

describe("useMediaQuery", () => {
  it("reports the current match", () => {
    setMediaQuery(QUERY, true)
    const { result } = renderHook(() => useMediaQuery(QUERY))
    expect(result.current).toBe(true)
  })

  it("re-renders when the query changes", () => {
    setMediaQuery(QUERY, false)
    const { result } = renderHook(() => useMediaQuery(QUERY))
    expect(result.current).toBe(false)

    act(() => setMediaQuery(QUERY, true))
    expect(result.current).toBe(true)
  })

  it("exposes a reduced-motion helper", () => {
    setMediaQuery(PREFERS_REDUCED_MOTION, true)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })
})
