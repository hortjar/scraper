import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "../lib/api/errors"

import { configureSessionRefresh, sessionFetch } from "./session-fetch"

const URL = "https://api.test/monitors"

const respond = (status: number) => new Response(null, { status })

afterEach(() => {
  vi.unstubAllGlobals()
  configureSessionRefresh(() => Promise.resolve(false))
})

describe("sessionFetch", () => {
  it("passes a successful response straight through", async () => {
    const fetchStub = vi.fn().mockResolvedValue(respond(200))
    vi.stubGlobal("fetch", fetchStub)

    const response = await sessionFetch(URL)

    expect(response.status).toBe(200)
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it("refreshes once and retries after a 401", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(respond(401))
      .mockResolvedValueOnce(respond(200))
    vi.stubGlobal("fetch", fetchStub)

    const refresh = vi.fn().mockResolvedValue(true)
    configureSessionRefresh(refresh)

    const response = await sessionFetch(URL)

    expect(response.status).toBe(200)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchStub).toHaveBeenCalledTimes(2)
  })

  it("returns the 401 without retrying when the refresh fails", async () => {
    const fetchStub = vi.fn().mockResolvedValue(respond(401))
    vi.stubGlobal("fetch", fetchStub)

    configureSessionRefresh(() => Promise.resolve(false))

    const response = await sessionFetch(URL)

    expect(response.status).toBe(401)
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it("shares one refresh across concurrent 401s", async () => {
    const fetchStub = vi.fn().mockResolvedValueOnce(respond(401)).mockResolvedValue(respond(200))
    vi.stubGlobal("fetch", fetchStub)

    const refresh = vi.fn().mockResolvedValue(true)
    configureSessionRefresh(refresh)

    await Promise.all([sessionFetch(URL), sessionFetch(URL)])

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("does not try to refresh the session probe itself", async () => {
    const fetchStub = vi.fn().mockResolvedValue(respond(401))
    vi.stubGlobal("fetch", fetchStub)

    const refresh = vi.fn().mockResolvedValue(true)
    configureSessionRefresh(refresh)

    const response = await sessionFetch("https://api.test/auth/me")

    expect(response.status).toBe(401)
    expect(refresh).not.toHaveBeenCalled()
  })

  it("reports a transport failure as an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))

    await expect(sessionFetch(URL)).rejects.toBeInstanceOf(ApiError)
  })
})
