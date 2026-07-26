export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  accepted: 202,
  noContent: 204,
  notModified: 304,
  badRequest: 400,
  unauthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  gone: 410,
  unprocessable: 422,
  tooManyRequests: 429,
  internalError: 500,
  serviceUnavailable: 503,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

export const HEADER = {
  authorization: "authorization",
  contentType: "content-type",
  acceptLanguage: "accept-language",
  retryAfter: "retry-after",
  userAgent: "user-agent",
  cookie: "cookie",
  ifModifiedSince: "if-modified-since",
  ifNoneMatch: "if-none-match",
  lastModified: "last-modified",
  etag: "etag",
  origin: "origin",
  location: "location",
  requestId: "x-request-id",
  idempotencyKey: "idempotency-key",
  signature: "x-scraper-signature",
  timestamp: "x-scraper-timestamp",
  event: "x-scraper-event",
  delivery: "x-scraper-delivery",
} as const

export const COOKIE = {
  session: "sid",
} as const

export const CONTENT_TYPE = {
  json: "application/json",
  form: "application/x-www-form-urlencoded",
  html: "text/html",
  text: "text/plain",
  jsonLd: "application/ld+json",
} as const

export const BEARER_PREFIX = "Bearer "

export const API_TAG = {
  auth: "Auth",
  monitors: "Monitors",
  runs: "Runs",
  channels: "Channels",
  rules: "Rules",
  system: "System",
  admin: "Admin",
} as const

export const ROUTE = {
  apiBase: "/api/v1",
  auth: "/auth",
  monitors: "/monitors",
  runs: "/runs",
  changes: "/changes",
  channels: "/channels",
  rules: "/rules",
  deliveries: "/deliveries",
  admin: "/admin",
  health: "/health",
  ready: "/ready",
  metrics: "/metrics",
  meta: "/meta",
  docs: "/docs",
} as const

export const PLUGIN = {
  effect: "effect",
  observability: "observability",
  errorHandler: "error-handler",
  requireUser: "auth/require-user",
  security: "security-headers",
} as const
