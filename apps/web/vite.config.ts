/* eslint import-x/no-cycle: ["error", { maxDepth: 6, ignoreExternal: true }] */
import { env } from "node:process"
import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const DEV_VERSION = "0.0.0-dev"
const DEV_SHA = "local"

const API_PROXY_TARGET = env.VITE_API_PROXY ?? "http://localhost:9300"

const CHUNKS: readonly (readonly [string, readonly string[]])[] = [
  ["react", ["/node_modules/react/", "/node_modules/react-dom/", "/node_modules/scheduler/"]],
  ["tanstack", ["/node_modules/@tanstack/"]],
  ["i18n", ["/node_modules/i18next", "/node_modules/react-i18next"]],
  ["ui", ["/node_modules/@radix-ui/", "/node_modules/lucide-react/", "/node_modules/cmdk/"]],
  ["charts", ["/node_modules/d3-", "/node_modules/recharts/"]],
]

const chunkFor = (id: string): string | undefined =>
  CHUNKS.find(([, patterns]) => patterns.some((pattern) => id.includes(pattern)))?.[0]

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(env.APP_VERSION ?? DEV_VERSION),
    __GIT_SHA__: JSON.stringify(env.GIT_SHA ?? DEV_SHA),
  },
  server: {
    port: 9301,
    proxy: {
      "/api": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => chunkFor(id),
      },
    },
  },
})
