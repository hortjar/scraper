import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { withTestConfig } from "../test-support/test-config.js"

import { Crypto } from "./crypto.service.js"

const run = <A, E>(effect: Effect.Effect<A, E, Crypto>, overrides?: Record<string, string>) =>
  effect.pipe(Effect.provide(Crypto.Default), withTestConfig(overrides))

describe("Crypto", () => {
  it.effect("round-trips a secret through encrypt and decrypt", () =>
    run(
      Effect.gen(function* () {
        const crypto = yield* Crypto
        const encrypted = yield* crypto.encrypt("super-secret-webhook-key")
        const decrypted = yield* crypto.decrypt(encrypted)
        expect(decrypted).toBe("super-secret-webhook-key")
      }),
    ),
  )

  it.effect("produces a distinct iv per encryption", () =>
    run(
      Effect.gen(function* () {
        const crypto = yield* Crypto
        const first = yield* crypto.encrypt("same-plaintext")
        const second = yield* crypto.encrypt("same-plaintext")
        expect(first.iv.equals(second.iv)).toBe(false)
        expect(first.ciphertext.equals(second.ciphertext)).toBe(false)
      }),
    ),
  )

  it.effect("fails to decrypt a tampered ciphertext", () =>
    run(
      Effect.gen(function* () {
        const crypto = yield* Crypto
        const encrypted = yield* crypto.encrypt("integrity-matters")
        const tampered = { ...encrypted, ciphertext: Buffer.from(encrypted.ciphertext) }
        tampered.ciphertext[0] = (tampered.ciphertext[0] ?? 0) ^ 0xff
        const result = yield* Effect.flip(crypto.decrypt(tampered))
        expect(result._tag).toBe("EncryptionFailed")
      }),
    ),
  )

  it.effect("cannot decrypt a secret encrypted under a different ENCRYPTION_KEY", () =>
    Effect.gen(function* () {
      const encrypted = yield* run(
        Effect.gen(function* () {
          const crypto = yield* Crypto
          return yield* crypto.encrypt("cross-key")
        }),
      )
      const result = yield* run(
        Effect.gen(function* () {
          const crypto = yield* Crypto
          return yield* Effect.flip(crypto.decrypt(encrypted))
        }),
        { ENCRYPTION_KEY: "b3RoZXItZW5jcnlwdGlvbi1rZXktMzItYnl0ZXMh" },
      )
      expect(result._tag).toBe("EncryptionFailed")
    }),
  )
})
