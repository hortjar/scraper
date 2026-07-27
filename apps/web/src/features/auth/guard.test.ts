import { describe, expect, it } from "vitest"

import { LOGIN_PATH, type SessionQueryClient, checkSession, resolveAppGuardRedirect } from "./guard"
import type { CurrentUser } from "./types"

describe("resolveAppGuardRedirect", () => {
  it("sends anonymous users to login", () => {
    expect(resolveAppGuardRedirect(false)).toBe(LOGIN_PATH)
  })

  it("lets authenticated users through", () => {
    expect(resolveAppGuardRedirect(true)).toBeNull()
  })
})

describe("checkSession", () => {
  it("is true when the session query resolves", async () => {
    const queryClient: SessionQueryClient = {
      ensureQueryData: () => Promise.resolve({} as CurrentUser),
    }
    await expect(checkSession(queryClient)).resolves.toBe(true)
  })

  it("is false when the session query rejects", async () => {
    const queryClient: SessionQueryClient = {
      ensureQueryData: () => Promise.reject(new Error("unauthorized")),
    }
    await expect(checkSession(queryClient)).resolves.toBe(false)
  })
})
