class MediaQueryListStub extends EventTarget {
  matches = false

  constructor(readonly media: string) {
    super()
  }
}

const registry = new Map<string, MediaQueryListStub>()

export const matchMediaStub = (media: string): MediaQueryListStub => {
  const existing = registry.get(media)
  if (existing) return existing
  const created = new MediaQueryListStub(media)
  registry.set(media, created)
  return created
}

export const clearMediaQueries = (): void => {
  registry.clear()
}

export const setMediaQuery = (media: string, isMatched: boolean): void => {
  const list = matchMediaStub(media)
  list.matches = isMatched
  list.dispatchEvent(new Event("change"))
}

export const setOnline = (isOnline: boolean): void => {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: isOnline })
  dispatchEvent(new Event(isOnline ? "online" : "offline"))
}
