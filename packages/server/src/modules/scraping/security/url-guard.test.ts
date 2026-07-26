import { Effect, Exit } from "effect"
import { describe, expect, it } from "vitest"

import { checkUrl } from "./url-guard.js"

const patterns = ["blocked.example", "*.corp.internal"]

const allowed = async (url: string) => {
  const exit = await Effect.runPromiseExit(checkUrl(url, patterns))
  expect(Exit.isSuccess(exit)).toBe(true)
}

const blockedWith = async (url: string, tag: "InvalidUrl" | "BlockedHost", reason: string) => {
  const exit = await Effect.runPromiseExit(checkUrl(url, patterns))
  expect(Exit.isFailure(exit)).toBe(true)
  if (Exit.isFailure(exit)) {
    const failure = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(failure?._tag).toBe(tag)
    expect((failure as { reason: string } | undefined)?.reason).toBe(reason)
  }
}

describe("checkUrl", () => {
  describe("scheme and credentials", () => {
    it.each([
      "ftp://example.com/",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "data:text/html,<script>",
      "gopher://example.com/",
    ])("rejects %s as an invalid scheme", async (url) => {
      await blockedWith(url, "InvalidUrl", "scheme")
    })

    it("rejects a url carrying a username", async () => {
      await blockedWith("http://user@8.8.8.8/", "InvalidUrl", "credentials")
    })

    it("rejects a url carrying a username and password", async () => {
      await blockedWith("http://user:pass@8.8.8.8/", "InvalidUrl", "credentials")
    })

    it("rejects a malformed url", async () => {
      await blockedWith("not a url", "InvalidUrl", "malformed")
    })
  })

  describe("loopback and private literal addresses", () => {
    it.each([
      "http://127.0.0.1/",
      "http://127.0.0.1:8080/admin",
      "http://localhost/",
      "http://LOCALHOST/",
      "http://0.0.0.0/",
      "http://[::1]/",
    ])("blocks %s", async (url) => {
      const exit = await Effect.runPromiseExit(checkUrl(url, patterns))
      expect(Exit.isFailure(exit)).toBe(true)
    })

    it.each([
      "http://10.0.0.5/",
      "http://172.16.4.4/",
      "http://192.168.1.1/",
      "http://169.254.169.254/",
      "http://100.64.0.1/",
      "http://[fc00::1]/",
      "http://[fe80::1]/",
      "http://[::ffff:10.0.0.1]/",
    ])("blocks the private-range literal %s", async (url) => {
      await blockedWith(url, "BlockedHost", "private")
    })
  })

  describe("denylist", () => {
    it.each(["https://router.local/", "https://svc.internal/", "https://box.localdomain/"])(
      "blocks the reserved tld %s",
      async (url) => {
        await blockedWith(url, "BlockedHost", "denylist")
      },
    )

    it("blocks an exact operator-configured pattern", async () => {
      await blockedWith("https://blocked.example/", "BlockedHost", "denylist")
    })

    it("blocks a wildcard operator-configured pattern", async () => {
      await blockedWith("https://metrics.corp.internal/", "BlockedHost", "denylist")
    })

    it("does not block an unrelated host", async () => {
      await allowed("http://93.184.216.34/")
    })
  })

  describe("allowed public literal addresses", () => {
    it.each(["http://8.8.8.8/", "http://1.1.1.1/", "https://93.184.216.34/path"])(
      "allows %s",
      async (url) => {
        await allowed(url)
      },
    )
  })
})
