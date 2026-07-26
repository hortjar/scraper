import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

import { Effect } from "effect"

export const sha256 = (value: string): Buffer => createHash("sha256").update(value, "utf8").digest()

export const sha1Hex = (value: string): string =>
  createHash("sha1").update(value, "utf8").digest("hex").toUpperCase()

export const randomUrlToken = (byteLength: number): Effect.Effect<string> =>
  Effect.sync(() => randomBytes(byteLength).toString("base64url"))

export const randomAlphanumeric = (byteLength: number): Effect.Effect<string> =>
  Effect.sync(() => randomBytes(byteLength).toString("base64url").replaceAll(/[_-]/g, "0"))

export const isEqualInConstantTime = (left: Buffer, right: Buffer): boolean =>
  left.length === right.length && timingSafeEqual(left, right)
