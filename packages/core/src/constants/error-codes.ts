export const ERROR_CODE = {
  validationFailed: "validation_failed",
  unauthenticated: "unauthenticated",
  forbidden: "forbidden",
  notFound: "not_found",
  conflict: "conflict",
  planLimitExceeded: "plan_limit_exceeded",
  rateLimited: "rate_limited",
  unprocessable: "unprocessable",
  serviceUnavailable: "service_unavailable",
  internalError: "internal_error",
} as const

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]
