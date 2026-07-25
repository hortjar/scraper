import { useCallback, useSyncExternalStore } from "react"

const isMatchedOnServer = () => false

export const useIsMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = matchMedia(query)
      list.addEventListener("change", onStoreChange)
      return () => {
        list.removeEventListener("change", onStoreChange)
      }
    },
    [query],
  )

  const isMatched = useCallback(() => matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, isMatched, isMatchedOnServer)
}

export const PREFERS_REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
export const PREFERS_DARK = "(prefers-color-scheme: dark)"

export const useIsReducedMotion = (): boolean => useIsMediaQuery(PREFERS_REDUCED_MOTION)
