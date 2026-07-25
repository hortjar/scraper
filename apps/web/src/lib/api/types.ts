export type MessageParameters = Readonly<Record<string, string | number>>

export interface ValidationIssue {
  readonly path: readonly string[]
  readonly messageKey: string
  readonly message?: string
}

export interface ErrorEnvelope {
  readonly code: string
  readonly messageKey: string
  readonly messageParams?: MessageParameters
  readonly message?: string
  readonly requestId?: string
  readonly issues?: readonly ValidationIssue[]
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
  readonly total: number
}

export const isErrorEnvelope = (value: unknown): value is ErrorEnvelope => {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<Record<keyof ErrorEnvelope, unknown>>
  return typeof candidate.code === "string" && typeof candidate.messageKey === "string"
}
