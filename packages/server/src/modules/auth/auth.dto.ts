import type { ApiKey, Session, SessionId } from "@scraper/core/domain"

import type { ApiKeyDto, SessionDto, UserDto } from "./auth.schema.js"
import type { UserRecord } from "./users/user.repository.js"

export const iso = (value: Date): string => value.toISOString()

export const isoOrNull = (value: Date | null): string | null =>
  value === null ? null : value.toISOString()

export const toUserDto = (user: UserRecord): UserDto => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  timezone: user.timezone,
  locale: user.locale,
  role: user.role,
  status: user.status,
  planLimits: user.planLimits,
  emailVerified: user.emailVerifiedAt !== null,
  createdAt: iso(user.createdAt),
})

export const toSessionDto = (session: Session, current: SessionId | null): SessionDto => ({
  id: session.id,
  current: session.id === current,
  userAgent: session.userAgent,
  ip: session.ip,
  lastSeenAt: iso(session.lastSeenAt),
  expiresAt: iso(session.expiresAt),
  createdAt: iso(session.createdAt),
})

export const toApiKeyDto = (key: ApiKey): ApiKeyDto => ({
  id: key.id,
  name: key.name,
  prefix: key.prefix,
  scopes: key.scopes,
  lastUsedAt: isoOrNull(key.lastUsedAt),
  expiresAt: isoOrNull(key.expiresAt),
  createdAt: iso(key.createdAt),
})
