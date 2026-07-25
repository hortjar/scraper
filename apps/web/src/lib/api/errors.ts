import { type MessageParameters, type ValidationIssue, isErrorEnvelope } from "./types"

export const CLIENT_ERROR_CODE = {
  network: "network",
  unknown: "unknown",
} as const

const MESSAGE_KEY = {
  network: "errors.network",
  unknown: "errors.unknown",
} as const

export interface ApiErrorInit {
  readonly status: number
  readonly code: string
  readonly messageKey: string
  readonly messageParams?: MessageParameters
  readonly message?: string
  readonly requestId?: string | null
  readonly issues?: readonly ValidationIssue[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly messageKey: string
  readonly messageParams: MessageParameters
  readonly issues: readonly ValidationIssue[]
  readonly requestId: string | null

  constructor(init: ApiErrorInit) {
    super(init.message ?? init.messageKey)
    this.name = "ApiError"
    this.status = init.status
    this.code = init.code
    this.messageKey = init.messageKey
    this.messageParams = init.messageParams ?? {}
    this.issues = init.issues ?? []
    this.requestId = init.requestId ?? null
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

export const isClientError = (error: unknown): boolean =>
  isApiError(error) && error.status >= 400 && error.status < 500

export const isUnauthorized = (error: unknown): boolean => isApiError(error) && error.status === 401

export const fromEnvelope = (status: number, body: unknown): ApiError => {
  if (!isErrorEnvelope(body)) {
    return new ApiError({
      status,
      code: CLIENT_ERROR_CODE.unknown,
      messageKey: MESSAGE_KEY.unknown,
    })
  }

  return new ApiError({
    status,
    code: body.code,
    messageKey: body.messageKey,
    messageParams: body.messageParams ?? {},
    message: body.message ?? body.messageKey,
    requestId: body.requestId ?? null,
    issues: body.issues ?? [],
  })
}

export const networkError = (cause: unknown): ApiError => {
  const error = new ApiError({
    status: 0,
    code: CLIENT_ERROR_CODE.network,
    messageKey: MESSAGE_KEY.network,
  })
  error.cause = cause
  return error
}

export const issuesByPath = (error: unknown): Readonly<Record<string, string>> => {
  if (!isApiError(error)) return {}
  return Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.messageKey]))
}
