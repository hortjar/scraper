export const DELTA_KIND = { absolute: "absolute", percent: "percent" } as const

export type DeltaKind = (typeof DELTA_KIND)[keyof typeof DELTA_KIND]
