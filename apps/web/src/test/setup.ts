import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

class MediaQueryListStub extends EventTarget {
  matches = false

  constructor(readonly media: string) {
    super()
  }
}

const registry = new Map<string, MediaQueryListStub>()

const matchMediaStub = (media: string): MediaQueryListStub => {
  const existing = registry.get(media)
  if (existing) return existing
  const created = new MediaQueryListStub(media)
  registry.set(media, created)
  return created
}

export const setMediaQuery = (media: string, matches: boolean): void => {
  const list = matchMediaStub(media)
  list.matches = matches
  list.dispatchEvent(new Event("change"))
}

export const setOnline = (online: boolean): void => {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: online })
  window.dispatchEvent(new Event(online ? "online" : "offline"))
}

vi.stubGlobal("matchMedia", matchMediaStub)

afterEach(() => {
  cleanup()
  registry.clear()
})
