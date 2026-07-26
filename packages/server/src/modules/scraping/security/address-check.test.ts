import { describe, expect, it } from "vitest"

import {
  hasEmbeddedCredentials,
  isAllowedScheme,
  isBlockedTld,
  isLoopbackHost,
  isPrivateIpv4,
  isPrivateIpv6,
  isPrivateOrReservedAddress,
  isMatchingBlockedPattern,
  stripIpv6Brackets,
} from "./address-check.js"

describe("isAllowedScheme", () => {
  it.each([
    ["http:", true],
    ["https:", true],
    ["ftp:", false],
    ["file:", false],
    ["gopher:", false],
    ["javascript:", false],
    ["data:", false],
  ])("%s -> %s", (scheme, expected) => {
    expect(isAllowedScheme(scheme)).toBe(expected)
  })
})

describe("hasEmbeddedCredentials", () => {
  it("flags a url with a username", () => {
    expect(hasEmbeddedCredentials(new URL("https://user@example.com/"))).toBe(true)
  })

  it("flags a url with a username and password", () => {
    expect(hasEmbeddedCredentials(new URL("https://user:pass@example.com/"))).toBe(true)
  })

  it("passes a plain url", () => {
    expect(hasEmbeddedCredentials(new URL("https://example.com/"))).toBe(false)
  })
})

describe("isLoopbackHost", () => {
  it.each([
    ["localhost", true],
    ["LOCALHOST", true],
    ["127.0.0.1", true],
    ["127.5.6.7", true],
    ["0.0.0.0", true],
    ["example.com", false],
    ["notlocalhost.com", false],
  ])("%s -> %s", (host, expected) => {
    expect(isLoopbackHost(host)).toBe(expected)
  })
})

describe("isBlockedTld", () => {
  it.each([
    ["router.local", true],
    ["service.internal", true],
    ["box.localdomain", true],
    ["printer.home.arpa", true],
    ["example.com", false],
    ["example.local.com", false],
  ])("%s -> %s", (host, expected) => {
    expect(isBlockedTld(host)).toBe(expected)
  })
})

describe("isMatchingBlockedPattern", () => {
  const patterns = ["evil.example", "*.corp.internal"]

  it.each([
    ["evil.example", true],
    ["EVIL.EXAMPLE", true],
    ["sub.evil.example", false],
    ["corp.internal", true],
    ["metrics.corp.internal", true],
    ["deep.metrics.corp.internal", true],
    ["notcorp.internal", false],
    ["example.com", false],
  ])("%s against %j -> %s", (host, expected) => {
    expect(isMatchingBlockedPattern(host, patterns)).toBe(expected)
  })

  it("never matches when the pattern list is empty", () => {
    expect(isMatchingBlockedPattern("anything.example", [])).toBe(false)
  })
})

describe("stripIpv6Brackets", () => {
  it("removes brackets", () => {
    expect(stripIpv6Brackets("[::1]")).toBe("::1")
  })

  it("leaves a bare address alone", () => {
    expect(stripIpv6Brackets("::1")).toBe("::1")
  })
})

describe("isPrivateIpv4", () => {
  it.each([
    ["10.0.0.1", true],
    ["10.255.255.255", true],
    ["127.0.0.1", true],
    ["169.254.1.1", true],
    ["192.168.1.1", true],
    ["172.16.0.1", true],
    ["172.31.255.255", true],
    ["172.32.0.1", false],
    ["0.0.0.0", true],
    ["100.64.0.1", true],
    ["100.127.255.255", true],
    ["100.128.0.1", false],
    ["8.8.8.8", false],
    ["1.1.1.1", false],
    ["93.184.216.34", false],
  ])("%s -> %s", (address, expected) => {
    expect(isPrivateIpv4(address)).toBe(expected)
  })
})

describe("isPrivateIpv6", () => {
  it.each([
    ["::1", true],
    ["::", true],
    ["fe80::1", true],
    ["febf:ffff::1", true],
    ["fec0::1", false],
    ["fc00::1", true],
    ["fd12:3456::1", true],
    ["ff00::1", false],
    ["::ffff:10.0.0.1", true],
    ["::ffff:8.8.8.8", false],
    ["2001:4860:4860::8888", false],
    ["2606:4700:4700::1111", false],
  ])("%s -> %s", (address, expected) => {
    expect(isPrivateIpv6(address)).toBe(expected)
  })
})

describe("isPrivateOrReservedAddress", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.1.2.3", true],
    ["8.8.8.8", false],
    ["::1", true],
    ["fc00::1", true],
    ["2001:4860:4860::8888", false],
    ["not-an-ip", false],
  ])("%s -> %s", (address, expected) => {
    expect(isPrivateOrReservedAddress(address)).toBe(expected)
  })
})

describe("isPrivateIpv6 against WHATWG-normalized forms", () => {
  it.each([
    ["::ffff:a00:1", true],
    ["::ffff:c0a8:101", true],
    ["::ffff:a9fe:a9fe", true],
    ["::ffff:808:808", false],
    ["2002:a00:1::", true],
    ["2002:808:808::", false],
    ["64:ff9b::a00:1", true],
    ["64:ff9b::808:808", false],
  ])("%s -> %s", (address, expected) => {
    expect(isPrivateIpv6(address)).toBe(expected)
  })

  it("agrees with the dotted-quad form the URL parser rewrites away", () => {
    const dotted = "::ffff:169.254.169.254"
    const normalized = new URL(`http://[${dotted}]/`).hostname.slice(1, -1)
    expect(normalized).not.toBe(dotted)
    expect(isPrivateIpv6(dotted)).toBe(true)
    expect(isPrivateIpv6(normalized)).toBe(true)
  })
})
