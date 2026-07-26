import { IdentityProviderUnavailable, Unauthenticated } from "@scraper/core/errors"
import { Effect, Schema } from "effect"
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose"

import { JWT_ALGORITHM } from "../auth.constants.js"

import type { UniversalSettings } from "./universal.config.js"

const AppGrant = Schema.Struct({
  app: Schema.String,
  roles: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  permissions: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
})

export const AccessTokenClaims = Schema.Struct({
  iss: Schema.String,
  sub: Schema.String,
  email: Schema.String,
  role: Schema.String,
  apps: Schema.optionalWith(Schema.Array(AppGrant), { default: () => [] }),
})
export type AccessTokenClaims = typeof AccessTokenClaims.Type

export interface UniversalIdentity {
  readonly subject: string
  readonly email: string
  readonly globalRole: string
  readonly roles: readonly string[]
  readonly permissions: readonly string[]
}

const PROVIDER_ERROR_CODES = new Set(["ERR_JWKS_TIMEOUT", "ERR_JWKS_INVALID", "ERR_JOSE_GENERIC"])

const codeOf = (cause: unknown): string | null =>
  typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : null

export const isProviderOutage = (cause: unknown): boolean => {
  const code = codeOf(cause)
  return code === null || PROVIDER_ERROR_CODES.has(code)
}

export const remoteJwks = (settings: UniversalSettings): JWTVerifyGetKey =>
  createRemoteJWKSet(new URL(settings.jwksUrl))

export const verifyAccessToken = (
  getKey: JWTVerifyGetKey,
  settings: UniversalSettings,
  token: string,
): Effect.Effect<UniversalIdentity, Unauthenticated | IdentityProviderUnavailable> =>
  Effect.tryPromise({
    try: () =>
      jwtVerify(token, getKey, {
        issuer: settings.issuer,
        audience: settings.audience,
        algorithms: [JWT_ALGORITHM],
      }),
    catch: (cause) =>
      isProviderOutage(cause)
        ? new IdentityProviderUnavailable({ detail: String(codeOf(cause) ?? cause) })
        : new Unauthenticated({ reason: "invalid" }),
  }).pipe(
    Effect.flatMap(({ payload }) =>
      Schema.decodeUnknown(AccessTokenClaims)(payload).pipe(
        Effect.mapError(() => new Unauthenticated({ reason: "invalid" })),
      ),
    ),
    Effect.map((claims) => {
      const grant = claims.apps.find((entry) => entry.app === settings.audience)
      return {
        subject: claims.sub,
        email: claims.email,
        globalRole: claims.role,
        roles: grant?.roles ?? [],
        permissions: grant?.permissions ?? [],
      }
    }),
  )
