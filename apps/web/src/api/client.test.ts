import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "../lib/api/errors"
import { appConfig } from "../lib/config"

import { client } from "./generated/client.gen"

import { getHealth } from "./index"

const BASE_URL = "https://api.test"

const jsonResponse = (status: number, body: unknown) =>
  Response.json(body, {
    status,
    headers: { "content-type": "application/json" },
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("generated client", () => {
  it("is configured from the runtime app config", () => {
    const config = client.getConfig()
    expect(config.baseUrl).toBe(appConfig.apiUrl)
    expect(config.credentials).toBe("include")
  })

  it("sends credentials and returns typed data", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { status: "ok", version: "1.2.3", commit: "abc", time: "now" }),
      )
    vi.stubGlobal("fetch", fetchStub)

    const result = await getHealth({ baseUrl: BASE_URL })

    expect(result.data?.version).toBe("1.2.3")

    const request = fetchStub.mock.calls[0]?.[0] as Request
    expect(request.url).toBe(`${BASE_URL}/health`)
    expect(request.credentials).toBe("include")
  })

  it("rejects with an ApiError carrying the server envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(404, {
          code: "not_found",
          messageKey: "errors.notFound",
          message: "Not found.",
          requestId: "req-1",
        }),
      ),
    )

    let error: unknown
    try {
      await getHealth({ baseUrl: BASE_URL })
    } catch (error_: unknown) {
      error = error_
    }

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 404,
      code: "not_found",
      messageKey: "errors.notFound",
      requestId: "req-1",
    })
  })
})
