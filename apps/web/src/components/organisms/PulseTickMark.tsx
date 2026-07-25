import {
  PULSE_OUTCOME,
  type PulseGeometry,
  type PulseTick,
  tickColor,
  tickHeight,
} from "./pulse-strip.geometry"

export interface PulseTickMarkProps {
  readonly tick: PulseTick
  readonly geometry: PulseGeometry
  readonly x: number
  readonly animate?: boolean
}

const FAILED_MARK_SCALE = 0.34

export const PulseTickMark = ({ tick, geometry, x, animate }: PulseTickMarkProps) => {
  if (tick.outcome === PULSE_OUTCOME.paused) return null

  const centerX = x + geometry.tickWidth / 2

  if (tick.outcome === PULSE_OUTCOME.failed) {
    const arm = Math.max(geometry.height * FAILED_MARK_SCALE, geometry.tickWidth)
    const centerY = geometry.height / 2
    return (
      <path
        d={`M${String(centerX - arm / 2)} ${String(centerY - arm / 2)}l${String(arm)} ${String(arm)}M${String(centerX + arm / 2)} ${String(centerY - arm / 2)}l${String(-arm)} ${String(arm)}`}
        stroke={tickColor(tick)}
        strokeWidth={geometry.markStroke}
        strokeLinecap="round"
        fill="none"
      />
    )
  }

  const height = tickHeight(geometry, tick.magnitude)

  return (
    <rect
      x={x}
      y={geometry.height - height}
      width={geometry.tickWidth}
      height={height}
      rx={Math.min(geometry.tickWidth / 2, 1.5)}
      fill={tickColor(tick)}
      className={animate === true ? "origin-bottom animate-tick-in" : undefined}
    />
  )
}
