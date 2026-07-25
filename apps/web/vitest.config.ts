/* eslint import-x/no-cycle: ["error", { maxDepth: 6, ignoreExternal: true }] */
import { fileURLToPath, URL } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
    __GIT_SHA__: JSON.stringify("test"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
})
