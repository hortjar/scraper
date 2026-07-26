import { isIP } from "node:net"

import { PATTERN } from "@scraper/core"

export const ALLOWED_SCHEMES = ["http:", "https:"] as const

export const isAllowedScheme = (protocol: string): boolean =>
  (ALLOWED_SCHEMES as readonly string[]).includes(protocol)

export const hasEmbeddedCredentials = (url: URL): boolean =>
  url.username !== "" || url.password !== ""

export const isLoopbackHost = (hostname: string): boolean => PATTERN.loopbackHost.test(hostname)

export const isBlockedTld = (hostname: string): boolean => PATTERN.blockedTld.test(hostname)

const wildcardSuffix = (pattern: string): string | null =>
  pattern.startsWith("*.") ? pattern.slice(1) : null

export const isMatchingBlockedPattern = (
  hostname: string,
  patterns: readonly string[],
): boolean => {
  const lower = hostname.toLowerCase()
  return patterns.some((pattern) => {
    const trimmed = pattern.trim().toLowerCase()
    if (trimmed === "") return false
    const suffix = wildcardSuffix(trimmed)
    if (suffix === null) return lower === trimmed
    return lower === suffix.slice(1) || lower.endsWith(suffix)
  })
}

export const stripIpv6Brackets = (hostname: string): string =>
  hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname

export const ipVersion = (address: string): 4 | 6 | 0 => isIP(address) as 4 | 6 | 0

export const isPrivateIpv4 = (address: string): boolean => PATTERN.privateIpv4.test(address)

const HEXTET_COUNT = 8
const HEXTET_PATTERN = /^[0-9a-f]{1,4}$/
const DOTTED_QUAD_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
const BYTE_MAX = 255
const HEXTET_MAX = 0xff_ff

const dottedQuadToHextets = (piece: string): readonly number[] | null => {
  const octets = piece.split(".").map(Number)
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > BYTE_MAX)) return null
  const [a, b, c, d] = octets
  if (a === undefined || b === undefined || c === undefined || d === undefined) return null
  return [(a << 8) | b, (c << 8) | d]
}

const parseHextets = (part: string): readonly number[] | null => {
  if (part === "") return []
  const pieces = part.split(":")
  const out: number[] = []
  for (const [index, piece] of pieces.entries()) {
    if (DOTTED_QUAD_PATTERN.test(piece)) {
      if (index !== pieces.length - 1) return null
      const quad = dottedQuadToHextets(piece)
      if (quad === null) return null
      out.push(...quad)
      continue
    }
    if (!HEXTET_PATTERN.test(piece)) return null
    out.push(Number.parseInt(piece, 16))
  }
  return out
}

export const expandIpv6 = (address: string): readonly number[] | null => {
  const lower = address.toLowerCase().split("%", 1)[0] ?? ""
  const halves = lower.split("::")
  if (halves.length > 2) return null
  const head = parseHextets(halves[0] ?? "")
  const tail = halves.length === 2 ? parseHextets(halves[1] ?? "") : []
  if (head === null || tail === null) return null
  if (halves.length === 1) return head.length === HEXTET_COUNT ? head : null
  const fill = HEXTET_COUNT - head.length - tail.length
  if (fill < 0) return null
  return [...head, ...Array.from({ length: fill }, () => 0), ...tail]
}

const hextetsToIpv4 = (high: number, low: number): string =>
  [high >> 8, high & BYTE_MAX, low >> 8, low & BYTE_MAX].join(".")

const LINK_LOCAL_MASK = 0xff_c0
const LINK_LOCAL_PREFIX = 0xfe_80
const UNIQUE_LOCAL_MASK = 0xfe_00
const UNIQUE_LOCAL_PREFIX = 0xfc_00
const SIXTOFOUR_PREFIX = 0x20_02
const NAT64_PREFIX = [0x00_64, 0xff_9b] as const

type Hextets = readonly number[]

const at = (hextets: Hextets, index: number): number => hextets[index] ?? 0

const isAllZero = (hextets: Hextets): boolean => hextets.every((hextet) => hextet === 0)

const isUnspecifiedAddress = (hextets: Hextets): boolean => isAllZero(hextets)

const isLoopbackAddress = (hextets: Hextets): boolean =>
  at(hextets, 7) === 1 && isAllZero(hextets.slice(0, 7))

const trailingIpv4 = (hextets: Hextets): string => hextetsToIpv4(at(hextets, 6), at(hextets, 7))

const isMappedOrCompatible = (hextets: Hextets): boolean => {
  if (!isAllZero(hextets.slice(0, 5))) return false
  const marker = at(hextets, 5)
  return marker === HEXTET_MAX || marker === 0
}

const isNat64 = (hextets: Hextets): boolean =>
  at(hextets, 0) === NAT64_PREFIX[0] && at(hextets, 1) === NAT64_PREFIX[1]

const embeddedIpv4 = (hextets: Hextets): string | null => {
  if (isMappedOrCompatible(hextets)) return trailingIpv4(hextets)
  if (at(hextets, 0) === SIXTOFOUR_PREFIX) {
    return hextetsToIpv4(at(hextets, 1), at(hextets, 2))
  }
  if (isNat64(hextets)) return trailingIpv4(hextets)
  return null
}

const isReservedIpv6Prefix = (first: number): boolean =>
  (first & LINK_LOCAL_MASK) === LINK_LOCAL_PREFIX ||
  (first & UNIQUE_LOCAL_MASK) === UNIQUE_LOCAL_PREFIX

export const isPrivateIpv6 = (address: string): boolean => {
  const hextets = expandIpv6(address)
  if (hextets === null) return false
  if (isUnspecifiedAddress(hextets) || isLoopbackAddress(hextets)) return true

  const embedded = embeddedIpv4(hextets)
  if (embedded !== null) return isPrivateIpv4(embedded)

  return isReservedIpv6Prefix(at(hextets, 0))
}

export const isPrivateOrReservedAddress = (address: string): boolean => {
  const version = ipVersion(address)
  if (version === 4) return isPrivateIpv4(address)
  if (version === 6) return isPrivateIpv6(address)
  return false
}
