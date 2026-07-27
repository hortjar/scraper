import * as jestDomMatchers from "@testing-library/jest-dom/matchers"
import { cleanup } from "@testing-library/react"
import { afterEach, expect, vi } from "vitest"

import { clearMediaQueries, matchMediaStub } from "./browser-stubs"

expect.extend(jestDomMatchers)

vi.stubGlobal("matchMedia", matchMediaStub)

afterEach(() => {
  cleanup()
  clearMediaQueries()
})
