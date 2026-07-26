export interface SlidingWindowInput {
  readonly hitTimestamps: readonly number[]
  readonly now: number
  readonly windowMs: number
  readonly limit: number
}

export interface SlidingWindowDecision {
  readonly allowed: boolean
  readonly retryAfterMs: number
}

export const slidingWindowDecision = ({
  hitTimestamps,
  now,
  windowMs,
  limit,
}: SlidingWindowInput): SlidingWindowDecision => {
  const windowStart = now - windowMs
  const withinWindow = hitTimestamps.filter((timestamp) => timestamp > windowStart)

  if (withinWindow.length < limit) {
    return { allowed: true, retryAfterMs: 0 }
  }

  const oldest = Math.min(...withinWindow)
  return { allowed: false, retryAfterMs: Math.max(0, oldest + windowMs - now) }
}
