import { base, type ConfigArray, defineConfig, elysia, react } from "@hortjar/eslint-config"

const BACKEND_FILES = ["packages/server/**/*.ts", "apps/api/**/*.ts", "apps/worker/**/*.ts"]

const architecture: ConfigArray = [
  {
    name: "scraper/effect-primitives",
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: "Use Effect Clock so tests can control time.",
        },
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: "Use Effect Random so behaviour is reproducible.",
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Use Effect Clock so tests can control time.",
        },
      ],
    },
  },
  {
    name: "scraper/module-boundaries",
    files: BACKEND_FILES,
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
  },
  {
    name: "scraper/config-package",
    files: ["packages/core/src/config/**/*.ts"],
    rules: { "no-restricted-globals": "off" },
  },
  {
    name: "scraper/web-effects",
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='useEffect']",
          message:
            "useEffect is banned. See AGENTS.md §5 for the replacement table; effects live only in src/lib/browser.",
        },
        {
          selector: "CallExpression[callee.name='useLayoutEffect']",
          message: "useLayoutEffect is banned outside src/lib/browser. See AGENTS.md §5.",
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: "Use the clock helper from lib/format so tests can control time.",
        },
      ],
    },
  },
  {
    name: "scraper/web-browser-lib",
    files: ["apps/web/src/lib/browser/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    name: "scraper/web-component-size",
    files: ["apps/web/src/components/**/*.tsx", "apps/web/src/landing/**/*.tsx"],
    rules: { "max-lines": ["error", { max: 150, skipBlankLines: true }] },
  },
  {
    name: "scraper/pending-hortjar-eslint-config-0.3.1",
    files: ["**/*.{ts,tsx}"],
    rules: {
      "unicorn/name-replacements": [
        "error",
        {
          replacements: {
            db: { database: true },
            e: false,
            repository: false,
          },
        },
      ],
    },
  },
  {
    name: "scraper/pending-hortjar-eslint-config-0.3.1-ambient",
    files: ["**/*.d.ts"],
    rules: { "no-var": "off" },
  },
]

export default defineConfig(
  base({
    strictness: "strict",
    tsconfigRootDir: import.meta.dirname,
    noComments: true,
  }),
  react({ files: ["apps/web/**/*.{ts,tsx}"], strictness: "strict", i18n: true }),
  elysia({ files: BACKEND_FILES, strictness: "strict", restrictProcessEnv: true }),
  architecture,
)
