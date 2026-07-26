import type { RootConfig } from "@scraper/core/config"

import type { AuditLog } from "../audit/audit-log.service.js"
import type { AuthMailer } from "../auth.mailer.js"
import type { AuthRateLimiter } from "../auth.rate-limit.js"
import type { PasswordHasher } from "../passwords/password-hasher.js"
import type { SessionRepository } from "../sessions/session.repository.js"
import type { VerificationTokenRepository } from "../tokens/verification-token.repository.js"

import type { UserRepository } from "./user.repository.js"

export interface UsersDependencies {
  readonly config: RootConfig
  readonly repository: UserRepository
  readonly sessions: SessionRepository
  readonly tokens: VerificationTokenRepository
  readonly hasher: PasswordHasher
  readonly audit: AuditLog
  readonly mailer: AuthMailer
  readonly limiter: AuthRateLimiter
}
