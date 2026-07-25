import { useCallback, useSyncExternalStore } from "react"

const noMatch = () => false

export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onStoreChange)
      return () => list.removeEventListener("change", onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, noMatch)
}

export const PREFERS_REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
export const PREFERS_DARK = "(prefers-color-scheme: dark)"

export const usePrefersReducedMotion = (): boolean => useMediaQuery(PREFERS_REDUCED_MOTION)
