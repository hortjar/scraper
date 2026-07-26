import { HTTP_STATUS } from "@scraper/core/constants"
import type { StandardSchemaV1 } from "@standard-schema/spec"
import { Schema } from "effect"

import {
  AcceptedDto,
  ApiKeyListDto,
  CreatedApiKeyDto,
  ErrorDto,
  NoContentDto,
  SessionListDto,
  UserDto,
} from "../auth.schema.js"

type Standard<S extends Schema.Schema.Any> = StandardSchemaV1<
  Schema.Schema.Encoded<S>,
  Schema.Schema.Type<S>
>

export const standardUser: Standard<typeof UserDto> = Schema.standardSchemaV1(UserDto)
export const standardSessionList: Standard<typeof SessionListDto> =
  Schema.standardSchemaV1(SessionListDto)
export const standardApiKeyList: Standard<typeof ApiKeyListDto> =
  Schema.standardSchemaV1(ApiKeyListDto)
export const standardCreatedApiKey: Standard<typeof CreatedApiKeyDto> =
  Schema.standardSchemaV1(CreatedApiKeyDto)
export const standardAccepted: Standard<typeof AcceptedDto> = Schema.standardSchemaV1(AcceptedDto)
export const standardNoContent: Standard<typeof NoContentDto> =
  Schema.standardSchemaV1(NoContentDto)
export const standardError: Standard<typeof ErrorDto> = Schema.standardSchemaV1(ErrorDto)

export const FAILURES = {
  [HTTP_STATUS.badRequest]: standardError,
  [HTTP_STATUS.unauthorized]: standardError,
  [HTTP_STATUS.forbidden]: standardError,
  [HTTP_STATUS.notFound]: standardError,
  [HTTP_STATUS.conflict]: standardError,
  [HTTP_STATUS.unprocessable]: standardError,
  [HTTP_STATUS.tooManyRequests]: standardError,
  [HTTP_STATUS.serviceUnavailable]: standardError,
  [HTTP_STATUS.internalError]: standardError,
} as const

export const ACCEPTED_BODY = { accepted: true } as const
