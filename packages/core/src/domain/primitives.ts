import { Schema } from "effect"

import { LIMITS, PAGINATION } from "../constants/defaults.js"
import { LOCALE } from "../constants/domain-values.js"
import { PATTERN } from "../constants/regex.js"

export const NonEmptyString = Schema.String.pipe(Schema.minLength(1), Schema.trimmed())

export const Email = Schema.String.pipe(
  Schema.lowercased(),
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  Schema.brand("Email"),
)
export type Email = typeof Email.Type

export const Password = Schema.String.pipe(
  Schema.minLength(LIMITS.passwordMin),
  Schema.maxLength(LIMITS.passwordMax),
  Schema.brand("Password"),
)
export type Password = typeof Password.Type

export const Timezone = Schema.String.pipe(
  Schema.pattern(PATTERN.ianaTimezone),
  Schema.brand("Timezone"),
)
export type Timezone = typeof Timezone.Type

export const Locale = Schema.Literal(LOCALE.en, LOCALE.cs)
export type Locale = typeof Locale.Type

export const HttpUrl = Schema.String.pipe(
  Schema.filter((value) => {
    try {
      const url = new URL(value)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }),
  Schema.brand("HttpUrl"),
)
export type HttpUrl = typeof HttpUrl.Type

export const ExtractorKey = Schema.String.pipe(
  Schema.pattern(PATTERN.extractorKey),
  Schema.brand("ExtractorKey"),
)
export type ExtractorKey = typeof ExtractorKey.Type

export const CronExpression = Schema.String.pipe(
  Schema.pattern(PATTERN.cronFiveField),
  Schema.brand("CronExpression"),
)
export type CronExpression = typeof CronExpression.Type

export const QuietHourTime = Schema.String.pipe(Schema.pattern(PATTERN.quietHourTime))

export const PositiveInt = Schema.Number.pipe(Schema.int(), Schema.positive())
export const NonNegativeInt = Schema.Number.pipe(Schema.int(), Schema.nonNegative())

export const Cursor = Schema.String.pipe(Schema.brand("Cursor"))
export type Cursor = typeof Cursor.Type

const PageLimit = Schema.Number.pipe(Schema.int(), Schema.between(1, PAGINATION.maxLimit))

export const PageQuery = Schema.Struct({
  limit: Schema.optionalWith(PageLimit, {
    default: () => PAGINATION.defaultLimit,
  }),
  cursor: Schema.optional(Cursor),
})
export type PageQuery = typeof PageQuery.Type

export const page = <A, I, R>(item: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    items: Schema.Array(item),
    nextCursor: Schema.NullOr(Cursor),
    total: NonNegativeInt,
  })

export const Money = Schema.Struct({
  amount: Schema.Number,
  currency: Schema.String.pipe(Schema.length(3), Schema.uppercased()),
})
export type Money = typeof Money.Type

export const Timestamps = Schema.Struct({
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})
