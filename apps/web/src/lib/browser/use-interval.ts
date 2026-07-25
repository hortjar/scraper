import { useEffect, useRef } from "react"

export const useInterval = (callback: () => void, delayMs: number | null): void => {
  const latest = useRef(callback)
  latest.current = callback

  useEffect(() => {
    if (delayMs === null) return undefined
    const id = window.setInterval(() => latest.current(), delayMs)
    return () => window.clearInterval(id)
  }, [delayMs])
}
