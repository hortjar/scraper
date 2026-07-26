import { hkdfSync, randomBytes, createCipheriv, createDecipheriv } from "node:crypto"

import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { EncryptionFailed } from "@scraper/core/errors"
import { Effect, Redacted } from "effect"

import {
  AES_ALGORITHM,
  AES_IV_BYTES,
  AES_KEY_BYTES,
  HKDF_HASH,
  HKDF_INFO,
  HKDF_SALT,
} from "./crypto.constants.js"

export interface EncryptedSecret {
  readonly ciphertext: Buffer
  readonly iv: Buffer
  readonly tag: Buffer
}

const deriveKey = (encryptionKey: string): Buffer =>
  Buffer.from(hkdfSync(HKDF_HASH, encryptionKey, HKDF_SALT, HKDF_INFO, AES_KEY_BYTES))

export class Crypto extends Effect.Service<Crypto>()(SERVICE_TAG.Crypto, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const key = deriveKey(Redacted.value(config.security.encryptionKey))

    const encrypt = Effect.fn(SPAN.crypto.encrypt)(function* (plaintext: string) {
      return yield* Effect.try({
        try: (): EncryptedSecret => {
          const iv = randomBytes(AES_IV_BYTES)
          const cipher = createCipheriv(AES_ALGORITHM, key, iv)
          const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
          return { ciphertext, iv, tag: cipher.getAuthTag() }
        },
        catch: () => new EncryptionFailed({ operation: "encrypt" }),
      })
    })

    const decrypt = Effect.fn(SPAN.crypto.decrypt)(function* (secret: EncryptedSecret) {
      return yield* Effect.try({
        try: () => {
          const decipher = createDecipheriv(AES_ALGORITHM, key, secret.iv)
          decipher.setAuthTag(secret.tag)
          const plaintext = Buffer.concat([decipher.update(secret.ciphertext), decipher.final()])
          return plaintext.toString("utf8")
        },
        catch: () => new EncryptionFailed({ operation: "decrypt" }),
      })
    })

    return { encrypt, decrypt } as const
  }),
  dependencies: [AppConfig.Default],
}) {}

export const CryptoLive = Crypto.Default
