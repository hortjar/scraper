import { FNV_OFFSET_BASIS, FNV_PRIME } from "./jobs.constants.js"

const fnv1a = (value: string): number => {
  let hash = FNV_OFFSET_BASIS
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.codePointAt(index) ?? 0
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }
  return hash >>> 0
}

export const deterministicJitterMs = (seed: string, jitterSeconds: number): number => {
  if (jitterSeconds <= 0) return 0
  return fnv1a(seed) % (jitterSeconds * 1000)
}
