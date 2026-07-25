import type { Store } from "@tanstack/store"

const NAMESPACE = "scraper"

const storageKey = (name: string): string => `${NAMESPACE}:${name}`

const storage = (): Storage | null => {
  try {
    return globalThis.window?.localStorage ?? null
  } catch {
    return null
  }
}

export const readPersisted = <T>(
  name: string,
  isValid: (value: unknown) => value is T,
): T | null => {
  const raw = storage()?.getItem(storageKey(name))
  if (raw === null || raw === undefined) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const hydrate = <T>(name: string, fallback: T, isValid: (value: unknown) => value is T): T =>
  readPersisted(name, isValid) ?? fallback

export const persist = <T>(store: Store<T>, name: string): void => {
  store.subscribe((value) => {
    try {
      storage()?.setItem(storageKey(name), JSON.stringify(value))
    } catch {
      return
    }
  })
}
