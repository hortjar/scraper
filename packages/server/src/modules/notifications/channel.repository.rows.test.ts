import { describe, expect, it } from "vitest"

import type { ChannelRow } from "./channel.repository.rows.js"
import { mergeChannelPatch, timestampParameter, withHasSecret } from "./channel.repository.rows.js"

const CREATED_AT = new Date("2026-07-01T10:00:00.000Z")
const VERIFIED_AT = new Date("2026-07-02T10:00:00.000Z")

const row = (overrides: Partial<ChannelRow> = {}): ChannelRow => ({
  id: "8c2b0a1e-0000-4000-8000-000000000001",
  userId: "8c2b0a1e-0000-4000-8000-000000000002",
  kind: "webhook",
  name: "Original name",
  config: { url: "https://example.com/hook" },
  secret: Buffer.from("cipher"),
  secretIv: Buffer.from("iv"),
  secretTag: Buffer.from("tag"),
  verifiedAt: VERIFIED_AT,
  enabled: true,
  failureCount: 0,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
})

describe("mergeChannelPatch", () => {
  it("applies a name change when the secret is untouched", () => {
    const next = mergeChannelPatch(row(), { name: "Renamed" })
    expect(next.name).toBe("Renamed")
  })

  it("applies a config change when the secret is untouched", () => {
    const config = { url: "https://example.com/other" }
    const next = mergeChannelPatch(row(), { config })
    expect(next.config).toStrictEqual(config)
  })

  it("applies an enabled change when the secret is untouched", () => {
    const next = mergeChannelPatch(row({ enabled: true }), { enabled: false })
    expect(next.enabled).toBe(false)
  })

  it("keeps the stored secret and verification when the patch omits the secret", () => {
    const existing = row()
    const next = mergeChannelPatch(existing, { name: "Renamed" })
    expect(next.secret).toBe(existing.secret)
    expect(next.secretIv).toBe(existing.secretIv)
    expect(next.secretTag).toBe(existing.secretTag)
    expect(next.verifiedAt).toBe(VERIFIED_AT)
  })

  it("replaces the secret and clears verification when a new secret is supplied", () => {
    const secret = { secret: Buffer.from("new"), iv: Buffer.from("niv"), tag: Buffer.from("ntag") }
    const next = mergeChannelPatch(row(), { secret })
    expect(next.secret).toBe(secret.secret)
    expect(next.verifiedAt).toBeNull()
  })

  it("clears the secret when the patch sets it to null", () => {
    const next = mergeChannelPatch(row(), { secret: null })
    expect(next.secret).toBeNull()
    expect(next.secretIv).toBeNull()
    expect(next.secretTag).toBeNull()
    expect(next.verifiedAt).toBeNull()
  })

  it("leaves untouched fields at their stored values", () => {
    const existing = row()
    const next = mergeChannelPatch(existing, { name: "Renamed" })
    expect(next.config).toStrictEqual(existing.config)
    expect(next.enabled).toBe(existing.enabled)
  })
})

describe("withHasSecret", () => {
  it("reports whether a secret is stored", () => {
    expect(withHasSecret(row()).hasSecret).toBe(true)
    expect(withHasSecret(row({ secret: null })).hasSecret).toBe(false)
  })

  it("coerces timestamps the driver returned as strings", () => {
    const raw = row({
      createdAt: "2026-07-01 10:00:00+00" as unknown as Date,
      updatedAt: "2026-07-01 10:00:00+00" as unknown as Date,
      verifiedAt: "2026-07-02 10:00:00+00" as unknown as Date,
    })
    const decoded = withHasSecret(raw)
    expect(decoded.createdAt).toBeInstanceOf(Date)
    expect(decoded.createdAt?.toISOString()).toBe(CREATED_AT.toISOString())
    expect(decoded.verifiedAt?.toISOString()).toBe(VERIFIED_AT.toISOString())
  })

  it("leaves a null verification timestamp null", () => {
    expect(withHasSecret(row({ verifiedAt: null })).verifiedAt).toBeNull()
  })
})

describe("timestampParameter", () => {
  it("sends a timestamp as an ISO string the driver accepts", () => {
    expect(timestampParameter(VERIFIED_AT)).toBe(VERIFIED_AT.toISOString())
  })

  it("passes null through", () => {
    expect(timestampParameter(null)).toBeNull()
  })
})
