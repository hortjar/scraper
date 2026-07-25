import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "apps/api/openapi.json",
  output: {
    path: "apps/web/src/api/generated",
    postProcess: [
      "prettier",
      { command: "node", args: ["apps/web/scripts/seal-generated.mjs", "{{path}}"] },
    ],
  },
  plugins: [
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "./apps/web/src/api/runtime-config.ts",
    },
    "@hey-api/typescript",
    {
      name: "@hey-api/sdk",
      operations: { strategy: "flat" },
    },
    {
      name: "@tanstack/react-query",
      queryOptions: true,
      mutationOptions: true,
    },
  ],
})
