import { PATTERN } from "@scraper/core/constants"
import type { QuietHours } from "@scraper/core/domain"

const MINUTES_PER_HOUR = 60
const TIME_FORMAT_OPTIONS = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } as const
const LOCALE = "en-GB"

export const minutesOfDay = (time: string): number => {
  const match = PATTERN.quietHourTime.exec(time)
  const hours = match?.[1]
  const minutes = match?.[2]
  if (hours === undefined || minutes === undefined) return 0
  return Number(hours) * MINUTES_PER_HOUR + Number(minutes)
}

export const localMinutesOfDay = (now: Date, timezone: string): number => {
  const formatted = new Intl.DateTimeFormat(LOCALE, {
    ...TIME_FORMAT_OPTIONS,
    timeZone: timezone,
  }).format(now)
  return minutesOfDay(formatted)
}

export const isWithinQuietHours = (quietHours: QuietHours, now: Date): boolean => {
  const start = minutesOfDay(quietHours.start)
  const end = minutesOfDay(quietHours.end)
  if (start === end) return false
  const current = localMinutesOfDay(now, quietHours.timezone)
  return start < end ? current >= start && current < end : current >= start || current < end
}
