import { useEffect, useRef } from "react"

type EventMap = WindowEventMap & DocumentEventMap & HTMLElementEventMap

export const useEventListener = <K extends keyof EventMap>(
  type: K,
  handler: (event: EventMap[K]) => void,
  target?: EventTarget | null,
  options?: AddEventListenerOptions,
): void => {
  const latest = useRef(handler)
  latest.current = handler

  useEffect(() => {
    const node = target === undefined ? window : target
    if (node === null) return undefined

    const listener = (event: Event) => latest.current(event as EventMap[K])
    node.addEventListener(type, listener, options)
    return () => node.removeEventListener(type, listener, options)
  }, [type, target, options])
}
