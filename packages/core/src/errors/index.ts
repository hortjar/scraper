import { Data } from "effect"

import type { ErrorCode } from "../constants/error-codes.js"

export interface ValidationIssue {
  readonly path: readonly string[]
  readonly messageKey: string
  readonly params?: Readonly<Record<string, string | number>>
}

export class ValidationFailed extends Data.TaggedError("ValidationFailed")<{
  readonly issues: readonly ValidationIssue[]
}> {}

export class Unauthenticated extends Data.TaggedError("Unauthenticated")<{
  readonly reason: "missing" | "expired" | "revoked" | "invalid"
}> {}

export class NotAuthorized extends Data.TaggedError("NotAuthorized")<{
  readonly action: string
}> {}

export class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly retryAfterSeconds: number
  readonly bucket: string
}> {}

export class PlanLimitExceeded extends Data.TaggedError("PlanLimitExceeded")<{
  readonly limit: number
  readonly resource: "monitors" | "channels" | "interval"
}> {}

export class Conflict extends Data.TaggedError("Conflict")<{
  readonly resource: string
  readonly field: string
}> {}

export class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id?: string
}> {}

export class MonitorNotFound extends Data.TaggedError("MonitorNotFound")<{
  readonly id: string
}> {}

export class RunNotFound extends Data.TaggedError("RunNotFound")<{
  readonly id: string
}> {}

export class ChannelNotFound extends Data.TaggedError("ChannelNotFound")<{
  readonly id: string
}> {}

export class RuleNotFound extends Data.TaggedError("RuleNotFound")<{
  readonly id: string
}> {}

export class DeliveryNotFound extends Data.TaggedError("DeliveryNotFound")<{
  readonly id: string
}> {}

export class ExtractorNotFound extends Data.TaggedError("ExtractorNotFound")<{
  readonly id: string
}> {}

export class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
  readonly id: string
}> {}

export class ApiKeyNotFound extends Data.TaggedError("ApiKeyNotFound")<{
  readonly id: string
}> {}

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials")<
  Record<string, never>
> {}

export class RegistrationClosed extends Data.TaggedError("RegistrationClosed")<
  Record<string, never>
> {}

export class LocalAuthDisabled extends Data.TaggedError("LocalAuthDisabled")<{
  readonly operation: string
}> {}

export class PasswordRejected extends Data.TaggedError("PasswordRejected")<{
  readonly reason: "too_short" | "breached"
  readonly minLength: number
}> {}

export class ApiKeyNotAllowed extends Data.TaggedError("ApiKeyNotAllowed")<{
  readonly action: string
}> {}

export class InsufficientScope extends Data.TaggedError("InsufficientScope")<{
  readonly required: string
}> {}

export class IdentityProviderUnavailable extends Data.TaggedError("IdentityProviderUnavailable")<{
  readonly detail: string
}> {}

export class TokenInvalid extends Data.TaggedError("TokenInvalid")<{
  readonly purpose: string
}> {}

export class EmailNotVerified extends Data.TaggedError("EmailNotVerified")<{
  readonly email: string
}> {}

export class InvalidUrl extends Data.TaggedError("InvalidUrl")<{
  readonly url: string
  readonly reason: "scheme" | "malformed" | "credentials"
}> {}

export class BlockedHost extends Data.TaggedError("BlockedHost")<{
  readonly host: string
  readonly reason: "private" | "loopback" | "denylist" | "unresolvable"
}> {}

export class RobotsDisallowed extends Data.TaggedError("RobotsDisallowed")<{
  readonly url: string
}> {}

export type ScrapeFailureReason =
  | "timeout"
  | "network"
  | "dns"
  | "http_error"
  | "too_large"
  | "challenge"
  | "browser_unavailable"
  | "navigation"

export class ScrapeFailed extends Data.TaggedError("ScrapeFailed")<{
  readonly reason: ScrapeFailureReason
  readonly retryable: boolean
  readonly httpStatus?: number
  readonly detail?: string
}> {}

export class ExtractorMissing extends Data.TaggedError("ExtractorMissing")<{
  readonly extractorKey: string
  readonly selector: string
}> {}

export class TransformFailed extends Data.TaggedError("TransformFailed")<{
  readonly extractorKey: string
  readonly transform: string
  readonly detail: string
}> {}

export class SelectorInvalid extends Data.TaggedError("SelectorInvalid")<{
  readonly selector: string
  readonly kind: string
}> {}

export class DeliveryFailed extends Data.TaggedError("DeliveryFailed")<{
  readonly channelKind: string
  readonly retryable: boolean
  readonly status?: number
  readonly detail?: string
}> {}

export class TemplateInvalid extends Data.TaggedError("TemplateInvalid")<{
  readonly detail: string
}> {}

export class EncryptionFailed extends Data.TaggedError("EncryptionFailed")<{
  readonly operation: "encrypt" | "decrypt"
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly operation: string
  readonly cause: unknown
}> {}

export class DataCorruption extends Data.TaggedError("DataCorruption")<{
  readonly entity: string
  readonly detail: string
}> {}

export class QueueUnavailable extends Data.TaggedError("QueueUnavailable")<{
  readonly queue: string
  readonly cause: unknown
}> {}

export class InvalidJobPayload extends Data.TaggedError("InvalidJobPayload")<{
  readonly queue: string
  readonly detail: string
}> {}

export class ConfigInvalid extends Data.TaggedError("ConfigInvalid")<{
  readonly problems: readonly string[]
}> {}

export class ScreenshotNotFound extends Data.TaggedError("ScreenshotNotFound")<{
  readonly id: string
}> {}

export class StorageUnavailable extends Data.TaggedError("StorageUnavailable")<{
  readonly operation: string
  readonly cause: unknown
}> {}

export type AppError =
  | ValidationFailed
  | Unauthenticated
  | NotAuthorized
  | RateLimited
  | PlanLimitExceeded
  | Conflict
  | UserNotFound
  | MonitorNotFound
  | RunNotFound
  | ChannelNotFound
  | RuleNotFound
  | DeliveryNotFound
  | ExtractorNotFound
  | SessionNotFound
  | ApiKeyNotFound
  | InvalidCredentials
  | RegistrationClosed
  | LocalAuthDisabled
  | PasswordRejected
  | ApiKeyNotAllowed
  | InsufficientScope
  | IdentityProviderUnavailable
  | TokenInvalid
  | EmailNotVerified
  | InvalidUrl
  | BlockedHost
  | RobotsDisallowed
  | ScrapeFailed
  | ExtractorMissing
  | TransformFailed
  | SelectorInvalid
  | DeliveryFailed
  | TemplateInvalid
  | EncryptionFailed
  | DatabaseError
  | DataCorruption
  | QueueUnavailable
  | InvalidJobPayload
  | ConfigInvalid
  | ScreenshotNotFound
  | StorageUnavailable

export interface HttpErrorBody {
  readonly code: ErrorCode
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string | number>>
  readonly message: string
  readonly requestId: string
  readonly issues?: readonly ValidationIssue[]
}
