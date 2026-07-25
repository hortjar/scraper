import { useEffect, useRef } from "react"

type EventMap = WindowEventMap & DocumentEventMap & HTMLElementEventMap

export const useEventListener = <K extends keyof EventMap>(
  type: K,
  handler: (event: EventMap[K]) => void,
  target?: EventTarget | null,
  options?: AddEventListenerOptions,
): void => {
  const latest = useRef(handler)

  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => {
    const node = target === undefined ? globalThis : target
    if (node === null) return

    const listener = (event: Event) => {
      latest.current(event as EventMap[K])
    }
    node.addEventListener(type, listener, options)
    return () => {
      node.removeEventListener(type, listener, options)
    }
  }, [type, target, options])
}
