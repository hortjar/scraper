import { lookup } from "node:dns/promises"

import { BlockedHost, InvalidUrl, SPAN } from "@scraper/core"
import { Effect } from "effect"

import {
  hasEmbeddedCredentials,
  isAllowedScheme,
  isBlockedTld,
  isLoopbackHost,
  isPrivateOrReservedAddress,
  ipVersion,
  isMatchingBlockedPattern,
  stripIpv6Brackets,
} from "./address-check.js"

const parseUrl = (rawUrl: string): Effect.Effect<URL, InvalidUrl> =>
  Effect.try({
    try: () => new URL(rawUrl),
    catch: () => new InvalidUrl({ url: rawUrl, reason: "malformed" }),
  })

const resolveAddresses = (hostname: string): Effect.Effect<readonly string[], BlockedHost> =>
  Effect.tryPromise({
    try: () => lookup(hostname, { all: true }),
    catch: () => new BlockedHost({ host: hostname, reason: "unresolvable" }),
  }).pipe(Effect.map((records) => records.map((record) => record.address)))

export const checkUrl = Effect.fn(SPAN.scraping.checkUrl)(function* (
  rawUrl: string,
  blockedHostPatterns: readonly string[],
) {
  const url = yield* parseUrl(rawUrl)

  if (!isAllowedScheme(url.protocol)) {
    return yield* Effect.fail(new InvalidUrl({ url: rawUrl, reason: "scheme" }))
  }
  if (hasEmbeddedCredentials(url)) {
    return yield* Effect.fail(new InvalidUrl({ url: rawUrl, reason: "credentials" }))
  }

  const hostname = stripIpv6Brackets(url.hostname)

  if (isLoopbackHost(hostname)) {
    return yield* Effect.fail(new BlockedHost({ host: hostname, reason: "loopback" }))
  }
  if (isBlockedTld(hostname) || isMatchingBlockedPattern(hostname, blockedHostPatterns)) {
    return yield* Effect.fail(new BlockedHost({ host: hostname, reason: "denylist" }))
  }

  if (ipVersion(hostname) !== 0) {
    if (isPrivateOrReservedAddress(hostname)) {
      return yield* Effect.fail(new BlockedHost({ host: hostname, reason: "private" }))
    }
    return url
  }

  const addresses = yield* resolveAddresses(hostname)
  const privateAddress = addresses.find((address) => isPrivateOrReservedAddress(address))
  if (privateAddress !== undefined) {
    return yield* Effect.fail(new BlockedHost({ host: hostname, reason: "private" }))
  }

  return url
})
