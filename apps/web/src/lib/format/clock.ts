export type DateInput = Date | string | number

export const now = (): Date => new Date()

export const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value))

export const isValidDate = (value: Date): boolean => !Number.isNaN(value.getTime())

export const resolveTimeZone = (): string => new Intl.DateTimeFormat().resolvedOptions().timeZone
