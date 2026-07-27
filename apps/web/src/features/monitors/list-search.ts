import { MONITOR_LIST } from "./constants"

export interface MonitorsSearch {
  readonly search?: string
  readonly tag?: string
  readonly limit?: number
  readonly cursor?: string
  readonly deleting?: string
}

export type MonitorsSearchPatch = {
  readonly [K in keyof MonitorsSearch]?: MonitorsSearch[K] | undefined
}

const text = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const numeric = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value !== "string") return undefined
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : undefined
}

const limit = (value: unknown): number | undefined => {
  const raw = numeric(value)
  if (raw === undefined) return undefined
  const clamped = Math.min(Math.max(Math.trunc(raw), 1), MONITOR_LIST.maxLimit)
  return clamped === MONITOR_LIST.defaultLimit ? undefined : clamped
}

const withKey = <K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> =>
  value === undefined ? {} : ({ [key]: value } as Record<K, V>)

export const validateMonitorsSearch = (raw: Record<string, unknown>): MonitorsSearch => ({
  ...withKey("search", text(raw.search)),
  ...withKey("tag", text(raw.tag)),
  ...withKey("limit", limit(raw.limit)),
  ...withKey("cursor", text(raw.cursor)),
  ...withKey("deleting", text(raw.deleting)),
})

export const toListQuery = (search: MonitorsSearch) => ({
  ...withKey("search", search.search),
  ...withKey("tag", search.tag),
  ...withKey("cursor", search.cursor),
  limit: search.limit ?? MONITOR_LIST.defaultLimit,
})
