import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

import { clearMediaQueries, matchMediaStub } from "./browser-stubs"

vi.stubGlobal("matchMedia", matchMediaStub)

afterEach(() => {
  cleanup()
  clearMediaQueries()
})
