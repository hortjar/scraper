import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { type DateInput, isValidDate, now, resolveTimeZone, toDate } from "./clock"

const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
]

const BYTE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const
const BYTE_STEP = 1000

const safe = (value: DateInput, render: (date: Date) => string): string => {
  const date = toDate(value)
  return isValidDate(date) ? render(date) : ""
}

const DURATION_UNITS: readonly (readonly [string, number])[] = [
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1000],
  ["millisecond", 1],
]

export interface Format {
  readonly locale: string
  readonly timeZone: string
  readonly date: (value: DateInput) => string
  readonly dateTime: (value: DateInput) => string
  readonly time: (value: DateInput) => string
  readonly relative: (value: DateInput, from?: DateInput) => string
  readonly number: (value: number, options?: Intl.NumberFormatOptions) => string
  readonly percent: (ratio: number, fractionDigits?: number) => string
  readonly bytes: (value: number) => string
  readonly duration: (milliseconds: number) => string
}

export const createFormat = (locale: string, timeZone: string): Format => {
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone })
  const dateTimeFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  })
  const timeFormat = new Intl.DateTimeFormat(locale, { timeStyle: "medium", timeZone })
  const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  const relative: Format["relative"] = (value, from) =>
    safe(value, (date) => {
      const origin = from === undefined ? now() : toDate(from)
      const deltaSeconds = (date.getTime() - origin.getTime()) / 1000
      const magnitude = Math.abs(deltaSeconds)
      const match = RELATIVE_UNITS.find(([, seconds]) => magnitude >= seconds)
      const [unit, seconds] = match ?? ["second", 1]
      return relativeFormat.format(Math.round(deltaSeconds / seconds), unit)
    })

  const bytes: Format["bytes"] = (value) => {
    const magnitude = Math.abs(value)
    const exponent = magnitude === 0 ? 0 : Math.floor(Math.log(magnitude) / Math.log(BYTE_STEP))
    const index = Math.min(Math.max(exponent, 0), BYTE_UNITS.length - 1)
    const unit = BYTE_UNITS[index] ?? "byte"
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumFractionDigits: index === 0 ? 0 : 1,
    }).format(value / BYTE_STEP ** index)
  }

  const duration: Format["duration"] = (milliseconds) => {
    const magnitude = Math.abs(milliseconds)
    const match = DURATION_UNITS.find(([, step]) => magnitude >= step)
    const [unit, step] = match ?? ["millisecond", 1]
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumFractionDigits: step === 1 ? 0 : 1,
    }).format(milliseconds / step)
  }

  return {
    locale,
    timeZone,
    date: (value) => safe(value, (date) => dateFormat.format(date)),
    dateTime: (value) => safe(value, (date) => dateTimeFormat.format(date)),
    time: (value) => safe(value, (date) => timeFormat.format(date)),
    relative,
    number: (value, options) => new Intl.NumberFormat(locale, options).format(value),
    percent: (ratio, fractionDigits = 1) =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: fractionDigits,
      }).format(ratio),
    bytes,
    duration,
  }
}

export const useFormat = (): Format => {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language

  return useMemo(() => createFormat(locale, resolveTimeZone()), [locale])
}
