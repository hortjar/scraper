import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useDocumentTitle } from "./use-document-title"

describe("useDocumentTitle", () => {
  it("sets the document title", () => {
    renderHook(() => useDocumentTitle("Monitors"))
    expect(document.title).toBe("Monitors")
  })

  it("restores the previous title on unmount", () => {
    document.title = "Scraper"
    const { unmount } = renderHook(() => useDocumentTitle("Runs"))
    expect(document.title).toBe("Runs")

    unmount()
    expect(document.title).toBe("Scraper")
  })
})
