import { LIMITS } from "@scraper/core/constants"
import {
  ApiKeyId,
  ApiKeyScope,
  Email,
  Locale,
  Password,
  SessionId,
  Timezone,
  User,
  type UserId,
  type UserRole,
} from "@scraper/core/domain"
import { ValidationFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { Effect, Schema } from "effect"

const EMAIL_FIELD = "email"
const EMAIL_MIN_LENGTH = 3
const EMAIL_MAX_LENGTH = 320
const API_KEY_NAME_MAX_LENGTH = 80
const DISPLAY_NAME_MAX_LENGTH = 120

export const EmailInput = Schema.String.pipe(
  Schema.minLength(EMAIL_MIN_LENGTH),
  Schema.maxLength(EMAIL_MAX_LENGTH),
)

export const DisplayNameInput = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(DISPLAY_NAME_MAX_LENGTH),
)

export const TokenInput = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(512))

export const normalizeEmail = (raw: string): Effect.Effect<Email, ValidationFailed> =>
  Schema.decodeUnknown(Email)(raw.trim().toLowerCase()).pipe(
    Effect.mapError(
      () =>
        new ValidationFailed({
          issues: [{ path: [EMAIL_FIELD], messageKey: MSG.errors.validationFailed }],
        }),
    ),
  )

export const UserDto = Schema.Struct({
  ...User.pick("id", "email", "displayName", "timezone", "locale", "role", "status", "planLimits")
    .fields,
  emailVerified: Schema.Boolean,
  createdAt: Schema.String,
})
export type UserDto = typeof UserDto.Type

export const SessionDto = Schema.Struct({
  id: SessionId,
  current: Schema.Boolean,
  userAgent: Schema.NullOr(Schema.String),
  ip: Schema.NullOr(Schema.String),
  lastSeenAt: Schema.String,
  expiresAt: Schema.String,
  createdAt: Schema.String,
})
export type SessionDto = typeof SessionDto.Type

export const SessionListDto = Schema.Struct({ items: Schema.Array(SessionDto) })

export const ApiKeyDto = Schema.Struct({
  id: ApiKeyId,
  name: Schema.String,
  prefix: Schema.String,
  scopes: Schema.Array(ApiKeyScope),
  lastUsedAt: Schema.NullOr(Schema.String),
  expiresAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
})
export type ApiKeyDto = typeof ApiKeyDto.Type

export const ApiKeyListDto = Schema.Struct({ items: Schema.Array(ApiKeyDto) })

export const CreatedApiKeyDto = Schema.Struct({
  ...ApiKeyDto.fields,
  key: Schema.String,
})
export type CreatedApiKeyDto = typeof CreatedApiKeyDto.Type

export const AcceptedDto = Schema.Struct({ accepted: Schema.Literal(true) })

export const NoContentDto = Schema.Null

const MessageParameters = Schema.Record({
  key: Schema.String,
  value: Schema.Union(Schema.String, Schema.Number),
})

export const ErrorIssueDto = Schema.Struct({
  path: Schema.Array(Schema.String),
  messageKey: Schema.String,
  params: Schema.optional(MessageParameters),
})

export const ErrorDto = Schema.Struct({
  code: Schema.String,
  messageKey: Schema.String,
  messageParams: Schema.optional(MessageParameters),
  message: Schema.String,
  requestId: Schema.String,
  issues: Schema.optional(Schema.Array(ErrorIssueDto)),
})

export const RegisterBody = Schema.Struct({
  email: EmailInput,
  password: Password,
  displayName: Schema.optional(DisplayNameInput),
})
export type RegisterBody = typeof RegisterBody.Type

export const LoginBody = Schema.Struct({
  email: EmailInput,
  password: Schema.String.pipe(Schema.maxLength(LIMITS.passwordMax)),
})
export type LoginBody = typeof LoginBody.Type

export const UpdateProfileBody = Schema.Struct({
  displayName: Schema.optional(Schema.NullOr(DisplayNameInput)),
  timezone: Schema.optional(Timezone),
  locale: Schema.optional(Locale),
})
export type UpdateProfileBody = typeof UpdateProfileBody.Type

export const ChangePasswordBody = Schema.Struct({
  currentPassword: Schema.String.pipe(Schema.maxLength(LIMITS.passwordMax)),
  newPassword: Password,
})
export type ChangePasswordBody = typeof ChangePasswordBody.Type

export const RequestPasswordResetBody = Schema.Struct({ email: EmailInput })
export type RequestPasswordResetBody = typeof RequestPasswordResetBody.Type

export const ResetPasswordBody = Schema.Struct({
  token: TokenInput,
  password: Password,
})
export type ResetPasswordBody = typeof ResetPasswordBody.Type

export const VerifyEmailBody = Schema.Struct({ token: TokenInput })
export type VerifyEmailBody = typeof VerifyEmailBody.Type

export const CreateApiKeyBody = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(API_KEY_NAME_MAX_LENGTH)),
  scopes: Schema.Array(ApiKeyScope).pipe(Schema.minItems(1)),
  expiresAt: Schema.optional(Schema.String),
})
export type CreateApiKeyBody = typeof CreateApiKeyBody.Type

export const SessionIdParameters = Schema.Struct({ sessionId: SessionId })
export const ApiKeyIdParameters = Schema.Struct({ apiKeyId: ApiKeyId })

export interface RequestContext {
  readonly ip: string | null
  readonly userAgent: string | null
}

export interface AuthActor {
  readonly userId: UserId
  readonly role: UserRole
  readonly locale: Locale
  readonly timezone: Timezone
  readonly email: Email
  readonly emailVerified: boolean
  readonly scopes: readonly ApiKeyScope[]
  readonly credential: string
  readonly sessionId: SessionId | null
  readonly apiKeyId: ApiKeyId | null
}

export interface IssuedSession {
  readonly token: string
  readonly sessionId: SessionId
  readonly expiresAt: Date
}

export interface LoginResult {
  readonly user: UserDto
  readonly session: IssuedSession
}
