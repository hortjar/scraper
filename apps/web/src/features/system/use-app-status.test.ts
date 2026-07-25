import { describe, expect, it } from "vitest"

import { deriveConnection } from "./use-app-status"

describe("deriveConnection", () => {
  it("is offline when the browser is offline", () => {
    expect(deriveConnection({ online: false, hasError: false, serverStatus: "ok" })).toBe("offline")
  })

  it("is reconnecting while health has not answered", () => {
    expect(deriveConnection({ online: true, hasError: false, serverStatus: undefined })).toBe(
      "reconnecting",
    )
  })

  it("is reconnecting when health errored", () => {
    expect(deriveConnection({ online: true, hasError: true, serverStatus: "ok" })).toBe(
      "reconnecting",
    )
  })

  it("is reconnecting when the server reports a degraded status", () => {
    expect(deriveConnection({ online: true, hasError: false, serverStatus: "degraded" })).toBe(
      "reconnecting",
    )
  })

  it("is connected when online and healthy", () => {
    expect(deriveConnection({ online: true, hasError: false, serverStatus: "ok" })).toBe(
      "connected",
    )
  })
})
