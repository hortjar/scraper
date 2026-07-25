import {
  PULSE_DIRECTION,
  PULSE_OUTCOME,
  type PulseTick,
} from "../components/organisms/pulse-strip.geometry"
import { now } from "../lib/format"
import { stableHash } from "../lib/utils"

const INTERVAL_MS = 15 * 60_000

const FAILED_AT = new Set([18])
const PAUSED_AT = new Set([23, 24])
const SPIKE_AT = new Map([
  [6, 0.95],
  [11, 0.34],
  [29, 0.78],
])

const magnitudeFor = (index: number): number => {
  const spike = SPIKE_AT.get(index)
  if (spike !== undefined) return spike
  return (stableHash(`pulse-${String(index)}`) % 12) / 100
}

export const demoPulseTicks = (count: number): readonly PulseTick[] => {
  const start = now().getTime() - count * INTERVAL_MS

  return Array.from({ length: count }, (_unused, index): PulseTick => {
    const magnitude = magnitudeFor(index)
    const outcome = FAILED_AT.has(index)
      ? PULSE_OUTCOME.failed
      : PAUSED_AT.has(index)
        ? PULSE_OUTCOME.paused
        : magnitude > 0.12
          ? PULSE_OUTCOME.changed
          : PULSE_OUTCOME.unchanged

    const direction =
      outcome === PULSE_OUTCOME.changed
        ? index % 2 === 0
          ? PULSE_DIRECTION.down
          : PULSE_DIRECTION.up
        : PULSE_DIRECTION.flat

    return {
      id: `demo-${String(index)}`,
      at: new Date(start + index * INTERVAL_MS).toISOString(),
      outcome,
      direction,
      magnitude,
    }
  })
}
