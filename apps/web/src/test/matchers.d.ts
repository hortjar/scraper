import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"

declare module "@vitest/expect" {
  interface Matchers<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
}
