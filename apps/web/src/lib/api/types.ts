export type MessageParams = Readonly<Record<string, string | number>>

export interface ValidationIssue {
  readonly path: readonly string[]
  readonly messageKey: string
  readonly message?: string
}

export interface ErrorEnvelope {
  readonly code: string
  readonly messageKey: string
  readonly messageParams?: MessageParams
  readonly message?: string
  readonly requestId?: string
  readonly issues?: readonly ValidationIssue[]
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
  readonly total: number
}

export interface HealthResponse {
  readonly status: string
  readonly version: string
  readonly commit: string
  readonly time: string
}

export type QueryValue = string | number | boolean | null | undefined

export type QueryParams = Readonly<Record<string, QueryValue>>

export const isErrorEnvelope = (value: unknown): value is ErrorEnvelope => {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<Record<keyof ErrorEnvelope, unknown>>
  return typeof candidate.code === "string" && typeof candidate.messageKey === "string"
}

export const isHealthResponse = (value: unknown): value is HealthResponse => {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<Record<keyof HealthResponse, unknown>>
  return typeof candidate.status === "string" && typeof candidate.version === "string"
}
