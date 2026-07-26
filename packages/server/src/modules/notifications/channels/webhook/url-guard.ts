import { PATTERN } from "@scraper/core/constants"
import { BlockedHost, InvalidUrl } from "@scraper/core/errors"
import { Effect } from "effect"

const isLoopback = (hostname: string): boolean => PATTERN.loopbackHost.test(hostname)
const isPrivateIpv4 = (hostname: string): boolean => PATTERN.privateIpv4.test(hostname)
const isBlockedTld = (hostname: string): boolean => PATTERN.blockedTld.test(hostname)

export const guardWebhookUrl = (url: string): Effect.Effect<URL, InvalidUrl | BlockedHost> =>
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => new URL(url),
      catch: () => new InvalidUrl({ url, reason: "malformed" }),
    })

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return yield* Effect.fail(new InvalidUrl({ url, reason: "scheme" }))
    }
    if (parsed.username !== "" || parsed.password !== "") {
      return yield* Effect.fail(new InvalidUrl({ url, reason: "credentials" }))
    }
    if (isLoopback(parsed.hostname)) {
      return yield* Effect.fail(new BlockedHost({ host: parsed.hostname, reason: "loopback" }))
    }
    if (isPrivateIpv4(parsed.hostname)) {
      return yield* Effect.fail(new BlockedHost({ host: parsed.hostname, reason: "private" }))
    }
    if (isBlockedTld(parsed.hostname)) {
      return yield* Effect.fail(new BlockedHost({ host: parsed.hostname, reason: "denylist" }))
    }
    return parsed
  })
