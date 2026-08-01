import { Layer } from "effect"

import { AuditLog } from "./audit/audit-log.service.js"
import { AuthMailer } from "./auth.mailer.js"
import { AuthRateLimiter, RateLimitStore } from "./auth.rate-limit.js"
import { ApiKeyRepository } from "./keys/api-key.repository.js"
import { ApiKeys } from "./keys/api-keys.service.js"
import { PasswordHasher } from "./passwords/password-hasher.js"
import { SessionRepository } from "./sessions/session.repository.js"
import { Sessions } from "./sessions/sessions.service.js"
import { VerificationTokenRepository } from "./tokens/verification-token.repository.js"
import { UniversalAuth } from "./universal/universal.service.js"
import { UserRepository } from "./users/user.repository.js"
import { Users } from "./users/users.service.js"

export { AuditLog } from "./audit/audit-log.service.js"
export type { AuditEntry } from "./audit/audit-log.service.js"

export {
  API_KEY,
  AUTH_OPERATION_ID,
  AUTH_PATH,
  CREDENTIAL,
  RATE_LIMIT_RULE,
  TOKEN_TTL_SECONDS,
  type Credential,
} from "./auth.constants.js"

export { bootstrapAdmin } from "./auth.bootstrap.js"

export { iso, isoOrNull, toApiKeyDto, toSessionDto, toUserDto } from "./auth.dto.js"

export { AUTH_HEADER } from "./auth.constants.js"
export { authBase, makeRunAuthEither } from "./auth.http.js"

export {
  buildSessionCookie,
  clearedSessionCookie,
  readCookie,
  requestContextFrom,
  sessionCookieFor,
  type AuthPluginOptions,
  type AuthRuntime,
  type AuthServices,
} from "./auth.http.js"

export {
  assertAllowed,
  normalizeRequireUser,
  requireUser,
  type RequireUserInput,
  type RequireUserOptions,
} from "./auth.macro.js"

export { AuthMailer, type AuthMail } from "./auth.mailer.js"

export {
  AuthRateLimiter,
  RateLimitStore,
  makeInMemoryRateLimitStore,
  makeRedisRateLimitStore,
  retryAfterSecondsFor,
  type RateLimitRedis,
  type RateLimitRule,
  type RateLimitStoreApi,
  type RateLimitVerdict,
} from "./auth.rate-limit.js"

export { authRoutes } from "./auth.routes.js"

export {
  ACCEPTED_BODY,
  FAILURES,
  standardAccepted,
  standardError,
  standardNoContent,
} from "./routes/auth.responses.js"

export {
  ApiKeyDto,
  ApiKeyListDto,
  CreateApiKeyBody,
  CreatedApiKeyDto,
  ErrorDto,
  LoginBody,
  RegisterBody,
  SessionDto,
  SessionListDto,
  UpdateProfileBody,
  UserDto,
  normalizeEmail,
  type AuthActor,
  type IssuedSession,
  type LoginResult,
  type RequestContext,
} from "./auth.schema.js"

export { ApiKeyRepository, type NewApiKey } from "./keys/api-key.repository.js"
export { ApiKeys, assertScope, formatApiKey, parseApiKey } from "./keys/api-keys.service.js"

export { PasswordHasher, isStaleHash, parsePhcParameters } from "./passwords/password-hasher.js"
export { assertPasswordAcceptable, checkBreached } from "./passwords/password-policy.js"

export { SessionRepository, type NewSession } from "./sessions/session.repository.js"
export { Sessions } from "./sessions/sessions.service.js"
export { bearerFrom, type Credentials } from "./sessions/authenticate.js"

export {
  VerificationTokenRepository,
  type NewVerificationToken,
  type TokenPurpose,
} from "./tokens/verification-token.repository.js"

export { isUniversalMode, universalSettingsFrom } from "./universal/universal.config.js"
export type { UniversalSettings } from "./universal/universal.config.js"
export { UniversalAuth, localUserIdFor, roleFrom } from "./universal/universal.service.js"
export {
  AccessTokenClaims,
  remoteJwks,
  verifyAccessToken,
  type UniversalIdentity,
} from "./universal/universal.verify.js"

export {
  UserRepository,
  UserRecord,
  type NewUser,
  type ProfilePatch,
} from "./users/user.repository.js"
export { Users } from "./users/users.service.js"

export const AuthLayer = Layer.mergeAll(
  Users.Default,
  Sessions.Default,
  ApiKeys.Default,
  UniversalAuth.Default,
  PasswordHasher.Default,
  AuditLog.Default,
  AuthMailer.Default,
  AuthRateLimiter.Default,
  RateLimitStore.Default,
  UserRepository.Default,
  SessionRepository.Default,
  ApiKeyRepository.Default,
  VerificationTokenRepository.Default,
)
