import { hash, verify } from "@node-rs/argon2"
import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { Effect } from "effect"

import { ARGON2_PARALLELISM, DUMMY_PASSWORD, PHC_PARAMETER } from "../auth.constants.js"
import { HashingFailed } from "../auth.errors.js"

export interface Argon2Parameters {
  readonly memoryCost: number
  readonly timeCost: number
  readonly parallelism: number
}

const PHC_SEPARATOR = "$"
const PARAMETER_SEPARATOR = ","
const ASSIGNMENT = "="

export const parsePhcParameters = (encoded: string): Partial<Argon2Parameters> => {
  const segment = encoded
    .split(PHC_SEPARATOR)
    .find((part) => part.startsWith(`${PHC_PARAMETER.memory}${ASSIGNMENT}`))
  if (segment === undefined) return {}

  const entries = new Map(
    segment.split(PARAMETER_SEPARATOR).map((pair) => {
      const [key, value] = pair.split(ASSIGNMENT)
      return [key ?? "", Number(value)] as const
    }),
  )

  const read = (key: string): number | undefined => {
    const value = entries.get(key)
    return value === undefined || Number.isNaN(value) ? undefined : value
  }

  return {
    ...(read(PHC_PARAMETER.memory) !== undefined && { memoryCost: read(PHC_PARAMETER.memory) }),
    ...(read(PHC_PARAMETER.time) !== undefined && { timeCost: read(PHC_PARAMETER.time) }),
    ...(read(PHC_PARAMETER.parallelism) !== undefined && {
      parallelism: read(PHC_PARAMETER.parallelism),
    }),
  } as Partial<Argon2Parameters>
}

export const isStaleHash = (encoded: string, current: Argon2Parameters): boolean => {
  const parsed = parsePhcParameters(encoded)
  if (parsed.memoryCost === undefined) return true
  return (
    parsed.memoryCost !== current.memoryCost ||
    parsed.timeCost !== current.timeCost ||
    parsed.parallelism !== current.parallelism
  )
}

export class PasswordHasher extends Effect.Service<PasswordHasher>()(SERVICE_TAG.PasswordHasher, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig

    const parameters: Argon2Parameters = {
      memoryCost: config.security.argon2MemoryKib,
      timeCost: config.security.argon2TimeCost,
      parallelism: ARGON2_PARALLELISM,
    }

    const hashPassword = Effect.fn(SPAN.auth.hashPassword)(function* (plain: string) {
      return yield* Effect.tryPromise({
        try: () => hash(plain, parameters),
        catch: (cause) => new HashingFailed({ operation: "hash", detail: String(cause) }),
      }).pipe(Effect.orDie)
    })

    const verifyPassword = Effect.fn(SPAN.auth.verifyPassword)(function* (
      encoded: string,
      plain: string,
    ) {
      return yield* Effect.tryPromise({
        try: () => verify(encoded, plain, parameters),
        catch: (cause) => new HashingFailed({ operation: "verify", detail: String(cause) }),
      }).pipe(Effect.orElseSucceed(() => false))
    })

    const equalizeTiming = hashPassword(DUMMY_PASSWORD).pipe(
      Effect.asVoid,
      Effect.withSpan(SPAN.auth.verifyPassword),
    )

    const shouldRehash = (encoded: string): boolean => isStaleHash(encoded, parameters)

    return {
      hash: hashPassword,
      verify: verifyPassword,
      equalizeTiming,
      shouldRehash,
      parameters,
    } as const
  }),
  dependencies: [AppConfig.Default],
}) {}
