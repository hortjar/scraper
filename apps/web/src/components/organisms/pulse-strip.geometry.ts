export const PULSE_SIZE = { hero: "hero", row: "row", header: "header" } as const
export type PulseSize = (typeof PULSE_SIZE)[keyof typeof PULSE_SIZE]

export const PULSE_DIRECTION = { up: "up", down: "down", flat: "flat" } as const
export type PulseDirection = (typeof PULSE_DIRECTION)[keyof typeof PULSE_DIRECTION]

export const PULSE_OUTCOME = {
  changed: "changed",
  unchanged: "unchanged",
  failed: "failed",
  paused: "paused",
} as const
export type PulseOutcome = (typeof PULSE_OUTCOME)[keyof typeof PULSE_OUTCOME]

export interface PulseTick {
  readonly id: string
  readonly at: string
  readonly outcome: PulseOutcome
  readonly direction: PulseDirection
  readonly magnitude: number
  readonly value?: string
}

export interface PulseGeometry {
  readonly height: number
  readonly tickWidth: number
  readonly gap: number
  readonly minTickHeight: number
  readonly maxTicks: number
  readonly markStroke: number
  readonly interactive: boolean
}

export const PULSE_GEOMETRY: Readonly<Record<PulseSize, PulseGeometry>> = {
  hero: {
    height: 72,
    tickWidth: 6,
    gap: 4,
    minTickHeight: 4,
    maxTicks: 32,
    markStroke: 1.75,
    interactive: false,
  },
  row: {
    height: 20,
    tickWidth: 1.5,
    gap: 0.5,
    minTickHeight: 2,
    maxTicks: 60,
    markStroke: 1,
    interactive: false,
  },
  header: {
    height: 40,
    tickWidth: 2,
    gap: 1,
    minTickHeight: 3,
    maxTicks: 200,
    markStroke: 1.25,
    interactive: true,
  },
}

export const pitch = (geometry: PulseGeometry): number => geometry.tickWidth + geometry.gap

export const stripWidth = (geometry: PulseGeometry, count: number): number =>
  Math.max(pitch(geometry) * count - geometry.gap, geometry.tickWidth)

export const tickX = (geometry: PulseGeometry, index: number): number => pitch(geometry) * index

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1)

export const tickHeight = (geometry: PulseGeometry, magnitude: number): number =>
  geometry.minTickHeight + (geometry.height - geometry.minTickHeight) * clamp01(magnitude)

export const DIRECTION_COLOR: Readonly<Record<PulseDirection, string>> = {
  up: "var(--positive)",
  down: "var(--negative)",
  flat: "var(--border-strong)",
}

export const tickColor = (tick: PulseTick): string => {
  if (tick.outcome === PULSE_OUTCOME.failed) return "var(--negative)"
  if (tick.outcome === PULSE_OUTCOME.unchanged) return "var(--border-strong)"
  return DIRECTION_COLOR[tick.direction]
}

export const visibleTicks = (
  ticks: readonly PulseTick[],
  geometry: PulseGeometry,
): readonly PulseTick[] => ticks.slice(-geometry.maxTicks)

export const idleTicks = (geometry: PulseGeometry): readonly PulseTick[] =>
  Array.from({ length: geometry.maxTicks }, (_unused, index) => ({
    id: `idle-${String(index)}`,
    at: "",
    outcome: PULSE_OUTCOME.unchanged,
    direction: PULSE_DIRECTION.flat,
    magnitude: 0,
  }))

export interface PulseCounts {
  readonly total: number
  readonly changed: number
  readonly failed: number
}

export const countTicks = (ticks: readonly PulseTick[]): PulseCounts => ({
  total: ticks.length,
  changed: ticks.filter((tick) => tick.outcome === PULSE_OUTCOME.changed).length,
  failed: ticks.filter((tick) => tick.outcome === PULSE_OUTCOME.failed).length,
})
