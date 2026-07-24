import tseslint from "typescript-eslint"

export const backend = tseslint.config({
  files: ["packages/server/**/*.ts", "apps/api/**/*.ts", "apps/worker/**/*.ts"],
  rules: {
    "import-x/no-restricted-paths": [
      "error",
      {
        zones: [
          {
            target: "./packages/core",
            from: "./packages",
            except: ["./core"],
            message: "core depends on nothing in the workspace.",
          },
          {
            target: "./packages/db",
            from: "./packages/server",
            message: "db must not depend on feature modules.",
          },
          {
            target: "./packages/server/src/modules/scraping",
            from: "./packages/db",
            message: "scraping is pure input to output and must not touch the database.",
          },
        ],
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/modules/*/!(index)", "**/modules/*/*"],
            message: "Import a module through its index.ts contract only.",
          },
          {
            group: ["zod", "@sinclair/typebox"],
            message: "Effect Schema is the only schema language.",
          },
        ],
      },
    ],
  },
})

export const configPackage = tseslint.config({
  files: ["packages/core/src/config/**/*.ts"],
  rules: { "no-restricted-globals": "off" },
})
