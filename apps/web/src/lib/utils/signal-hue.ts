export const SIGNAL_HUES = [
  "violet",
  "indigo",
  "cyan",
  "teal",
  "lime",
  "amber",
  "coral",
  "magenta",
] as const

export type SignalHue = (typeof SIGNAL_HUES)[number]

const FNV_OFFSET = 2_166_136_261
const FNV_PRIME = 16_777_619

export const stableHash = (value: string): number => {
  let hash = FNV_OFFSET
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.codePointAt(index) ?? 0
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

export const signalHueFor = (key: string): SignalHue => {
  const hue = SIGNAL_HUES[stableHash(key) % SIGNAL_HUES.length]
  return hue ?? "violet"
}

export const signalVariable = (hue: SignalHue, variant?: "soft" | "ink"): string =>
  variant ? `var(--sig-${hue}-${variant})` : `var(--sig-${hue})`
