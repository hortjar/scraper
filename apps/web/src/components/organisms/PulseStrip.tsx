import { useTranslation } from "react-i18next"

import { useFormat } from "../../lib/format"
import { cn } from "../../lib/utils"

import {
  PULSE_GEOMETRY,
  PULSE_OUTCOME,
  PULSE_SIZE,
  type PulseSize,
  type PulseTick,
  countTicks,
  idleTicks,
  stripWidth,
  tickX,
  visibleTicks,
} from "./pulse-strip.geometry"
import { PulseTickMark } from "./PulseTickMark"

export interface PulseStripProperties {
  readonly ticks: readonly PulseTick[]
  readonly size?: PulseSize
  readonly selectedTickId?: string
  readonly onSelectTick?: (tick: PulseTick) => void
  readonly animateLatest?: boolean
  readonly className?: string
}

const SELECT_KEYS = new Set(["Enter", " "])

export const PulseStrip = ({
  ticks,
  size = PULSE_SIZE.row,
  selectedTickId,
  onSelectTick,
  animateLatest,
  className,
}: PulseStripProperties) => {
  const { t } = useTranslation("common")
  const format = useFormat()

  const geometry = PULSE_GEOMETRY[size]
  const isIdle = ticks.length === 0
  const shown = isIdle ? idleTicks(geometry) : visibleTicks(ticks, geometry)
  const counts = countTicks(shown)
  const width = stripWidth(geometry, shown.length)

  const isInteractive = geometry.interactive && onSelectTick !== undefined
  const label = isIdle
    ? t("pulse.idle")
    : t("pulse.summary", {
        total: counts.total,
        changed: counts.changed,
        failed: counts.failed,
      })

  const describe = (tick: PulseTick): string => {
    if (tick.outcome === PULSE_OUTCOME.failed) return t("pulse.failed")
    if (tick.outcome === PULSE_OUTCOME.paused) return t("pulse.paused")
    if (tick.direction === "flat") return t("pulse.changeFlat")
    const value = tick.value ?? format.percent(tick.magnitude)
    return t(tick.direction === "up" ? "pulse.changeUp" : "pulse.changeDown", { value })
  }

  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(geometry.height)}`}
      width={size === PULSE_SIZE.row ? width : undefined}
      height={size === PULSE_SIZE.row ? geometry.height : undefined}
      preserveAspectRatio="none"
      role={isInteractive ? "group" : "img"}
      aria-label={label}
      className={cn(
        "block overflow-visible",
        size !== PULSE_SIZE.row && "h-auto w-full",
        isIdle && "opacity-60",
        className,
      )}
    >
      {shown.map((tick, index) => {
        const x = tickX(geometry, index)
        const mark = (
          <PulseTickMark
            tick={tick}
            geometry={geometry}
            x={x}
            animate={animateLatest === true && index === shown.length - 1}
          />
        )

        if (!isInteractive) return <g key={tick.id}>{mark}</g>

        return (
          <g
            key={tick.id}
            role="button"
            tabIndex={0}
            aria-label={t("pulse.tick", { time: format.dateTime(tick.at), change: describe(tick) })}
            aria-pressed={tick.id === selectedTickId}
            className="cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-brand"
            onClick={() => {
              onSelectTick(tick)
            }}
            onKeyDown={(event) => {
              if (!SELECT_KEYS.has(event.key)) return
              event.preventDefault()
              onSelectTick(tick)
            }}
          >
            <rect
              x={x - geometry.gap / 2}
              y={0}
              width={geometry.tickWidth + geometry.gap}
              height={geometry.height}
              fill="transparent"
            />
            {mark}
            {tick.id === selectedTickId ? (
              <rect
                x={x - geometry.gap / 2}
                y={0}
                width={geometry.tickWidth + geometry.gap}
                height={geometry.height}
                fill="var(--brand-soft)"
                opacity={0.6}
              />
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
