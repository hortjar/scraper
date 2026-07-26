import { LIMITS } from "@scraper/core/constants"

export const AUTH_TAG = {
  Mailer: "auth/Mailer",
  RateLimiter: "auth/RateLimiter",
  RateLimitStore: "auth/RateLimitStore",
  Bootstrap: "auth/Bootstrap",
} as const

export const AUTH_PLUGIN = {
  runtime: "auth/runtime",
  routes: "auth/routes",
  account: "auth/routes/account",
  password: "auth/routes/password",
  sessions: "auth/routes/sessions",
  apiKeys: "auth/routes/api-keys",
} as const

export const CREDENTIAL = {
  session: "session",
  apiKey: "api_key",
  universal: "universal",
} as const

export type Credential = (typeof CREDENTIAL)[keyof typeof CREDENTIAL]

export const AUTH_PATH = {
  register: "/register",
  login: "/login",
  logout: "/logout",
  me: "/me",
  sessions: "/sessions",
  sessionById: "/sessions/:sessionId",
  apiKeys: "/api-keys",
  apiKeyById: "/api-keys/:apiKeyId",
  password: "/password",
  passwordReset: "/password/reset",
  passwordResetRequest: "/password/reset/request",
  emailVerify: "/email/verify",
  emailVerifyRequest: "/email/verify/request",
} as const

export const AUTH_OPERATION_ID = {
  register: "register",
  login: "login",
  logout: "logout",
  getCurrentUser: "getCurrentUser",
  updateCurrentUser: "updateCurrentUser",
  requestEmailVerification: "requestEmailVerification",
  verifyEmail: "verifyEmail",
  requestPasswordReset: "requestPasswordReset",
  resetPassword: "resetPassword",
  changePassword: "changePassword",
  listSessions: "listSessions",
  revokeSession: "revokeSession",
  revokeAllSessions: "revokeAllSessions",
  listApiKeys: "listApiKeys",
  createApiKey: "createApiKey",
  revokeApiKey: "revokeApiKey",
} as const

export const AUTH_OPERATION = {
  register: "register",
  passwordLogin: "password_login",
  passwordChange: "password_change",
  passwordReset: "password_reset",
  emailVerification: "email_verification",
} as const

export const RATE_LIMIT_BUCKET = {
  login: "auth_login",
  register: "auth_register",
  passwordReset: "auth_password_reset",
} as const

export const RATE_LIMIT_RULE = {
  login: { limit: 5, windowSeconds: 900 },
  register: { limit: 3, windowSeconds: 3600 },
  passwordResetPerEmail: { limit: 3, windowSeconds: 3600 },
  passwordResetPerIp: { limit: 10, windowSeconds: 3600 },
} as const

export const TOKEN_TTL_SECONDS = {
  passwordReset: 900,
  emailVerify: 86_400,
} as const

export const TOKEN_BYTES = {
  session: 32,
  verification: 32,
  apiKeySecret: 32,
  apiKeyPrefix: 6,
} as const

export const API_KEY = {
  prefix: "sk",
  separator: "_",
  prefixLength: 8,
} as const

export const DUMMY_PASSWORD = "equalize-login-timing-for-unknown-accounts"

export const HIBP = {
  rangeUrl: "https://api.pwnedpasswords.com/range/",
  prefixLength: 5,
  timeoutMs: 2000,
} as const

export const PASSWORD_MIN_LENGTH = LIMITS.passwordMin

export const ARGON2_PARALLELISM = 1

export const PHC_PARAMETER = {
  memory: "m",
  time: "t",
  parallelism: "p",
} as const

export const AUDIT_SUBJECT = {
  user: "user",
  session: "session",
  apiKey: "api_key",
} as const

export const UNKNOWN_IP = "unknown"

export const AUTH_HEADER = {
  cookie: "cookie",
  setCookie: "set-cookie",
  forwardedFor: "x-forwarded-for",
} as const

export const COOKIE_ATTRIBUTE = {
  path: "Path=/",
  httpOnly: "HttpOnly",
  sameSite: "SameSite=Lax",
  secure: "Secure",
} as const

export const COOKIE_SEPARATOR = "; "

export const DEFAULT_TIMEZONE = "UTC"

export const WEB_PATH = {
  verifyEmail: "/verify-email",
  resetPassword: "/reset-password",
} as const

export const TOKEN_QUERY_PARAMETER = "token"

export const DEFAULT_MAX_CHANNELS = 10

export const JWKS_PATH = "/.well-known/jwks.json"

export const JWT_ALGORITHM = "RS256"

export const UNIVERSAL_PROVISION = {
  passwordHash: "!",
  displayNameFallback: null,
} as const

export const SESSION_LIST_LIMIT = 100
