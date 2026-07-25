import { Match } from "effect"

import { ERROR_CODE, type ErrorCode } from "../constants/error-codes.js"
import { HTTP_STATUS, type HttpStatus } from "../constants/http.js"
import type { AppError, ValidationIssue } from "../errors/index.js"
import { MSG } from "../i18n/keys.js"

export interface HttpFailure {
  readonly status: HttpStatus
  readonly code: ErrorCode
  readonly messageKey: string
  readonly messageParams: Readonly<Record<string, string | number>>
  readonly issues?: readonly ValidationIssue[]
  readonly retryAfterSeconds?: number
}

const failure = (
  status: HttpStatus,
  code: ErrorCode,
  messageKey: string,
  messageParams: Readonly<Record<string, string | number>> = {},
): HttpFailure => ({ status, code, messageKey, messageParams })

const notFound = (messageKey: string, id?: string): HttpFailure =>
  failure(HTTP_STATUS.notFound, ERROR_CODE.notFound, messageKey, id ? { id } : {})

const unprocessable = (
  messageKey: string,
  params: Readonly<Record<string, string | number>> = {},
): HttpFailure => failure(HTTP_STATUS.unprocessable, ERROR_CODE.unprocessable, messageKey, params)

const invalid = (
  messageKey: string,
  params: Readonly<Record<string, string | number>> = {},
): HttpFailure =>
  failure(HTTP_STATUS.unprocessable, ERROR_CODE.validationFailed, messageKey, params)

const internal = (): HttpFailure =>
  failure(HTTP_STATUS.internalError, ERROR_CODE.internalError, MSG.errors.internalError)

export const toHttpFailure: (error: AppError) => HttpFailure = Match.type<AppError>().pipe(
  Match.tagsExhaustive({
    ValidationFailed: (error) => ({
      ...invalid(MSG.errors.validationFailed),
      issues: error.issues,
    }),
    Unauthenticated: () =>
      failure(HTTP_STATUS.unauthorized, ERROR_CODE.unauthenticated, MSG.errors.unauthenticated),
    InvalidCredentials: () =>
      failure(HTTP_STATUS.unauthorized, ERROR_CODE.unauthenticated, MSG.errors.invalidCredentials),
    NotAuthorized: (error) =>
      failure(HTTP_STATUS.forbidden, ERROR_CODE.forbidden, MSG.errors.forbidden, {
        action: error.action,
      }),
    EmailNotVerified: () =>
      failure(HTTP_STATUS.forbidden, ERROR_CODE.forbidden, MSG.errors.emailNotVerified),
    RobotsDisallowed: (error) =>
      failure(HTTP_STATUS.forbidden, ERROR_CODE.forbidden, MSG.errors.robotsDisallowed, {
        url: error.url,
      }),
    MonitorNotFound: (error) => notFound(MSG.errors.monitorNotFound, error.id),
    RunNotFound: (error) => notFound(MSG.errors.runNotFound, error.id),
    ChannelNotFound: (error) => notFound(MSG.errors.channelNotFound, error.id),
    RuleNotFound: (error) => notFound(MSG.errors.ruleNotFound, error.id),
    ExtractorNotFound: (error) => notFound(MSG.errors.extractorNotFound, error.id),
    UserNotFound: () => notFound(MSG.errors.userNotFound),
    TokenInvalid: (error) =>
      failure(HTTP_STATUS.badRequest, ERROR_CODE.validationFailed, MSG.errors.tokenInvalid, {
        purpose: error.purpose,
      }),
    Conflict: (error) =>
      failure(HTTP_STATUS.conflict, ERROR_CODE.conflict, MSG.errors.conflict, {
        resource: error.resource,
        field: error.field,
      }),
    PlanLimitExceeded: (error) =>
      failure(
        HTTP_STATUS.paymentRequired,
        ERROR_CODE.planLimitExceeded,
        MSG.errors.planLimitExceeded,
        { limit: error.limit, resource: error.resource },
      ),
    RateLimited: (error) => ({
      ...failure(HTTP_STATUS.tooManyRequests, ERROR_CODE.rateLimited, MSG.errors.rateLimited, {
        seconds: error.retryAfterSeconds,
      }),
      retryAfterSeconds: error.retryAfterSeconds,
    }),
    InvalidUrl: (error) => invalid(MSG.errors.invalidUrl, { url: error.url, reason: error.reason }),
    BlockedHost: (error) =>
      invalid(MSG.errors.blockedHost, { host: error.host, reason: error.reason }),
    SelectorInvalid: (error) => invalid(MSG.errors.selectorInvalid, { kind: error.kind }),
    TemplateInvalid: () => invalid(MSG.errors.templateInvalid),
    ScrapeFailed: (error) => unprocessable(MSG.errors.scrapeFailed, { reason: error.reason }),
    ExtractorMissing: (error) =>
      unprocessable(MSG.errors.extractorMissing, { field: error.extractorKey }),
    TransformFailed: (error) =>
      unprocessable(MSG.errors.transformFailed, {
        field: error.extractorKey,
        transform: error.transform,
      }),
    DeliveryFailed: (error) =>
      unprocessable(MSG.errors.deliveryFailed, { channel: error.channelKind }),
    QueueUnavailable: () =>
      failure(
        HTTP_STATUS.serviceUnavailable,
        ERROR_CODE.serviceUnavailable,
        MSG.errors.serviceUnavailable,
      ),
    EncryptionFailed: internal,
    DbError: internal,
    DataCorruption: internal,
    InvalidJobPayload: internal,
    ConfigInvalid: internal,
  }),
)
