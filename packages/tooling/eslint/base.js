import js from "@eslint/js"
import tseslint from "typescript-eslint"
import importX from "eslint-plugin-import-x"
import globals from "globals"
import local from "./rules/no-comments.js"

export const ignores = {
  ignores: [
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/*.gen.ts",
    "**/generated/**",
    "**/routeTree.gen.ts",
  ],
}

export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: { local, "import-x": importX },
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.es2023 },
      parserOptions: { projectService: true },
    },
    rules: {
      "local/no-comments": "error",

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      "no-console": "error",
      "no-warning-comments": "off",
      "no-restricted-globals": [
        "error",
        { name: "process", message: "Read configuration through @scraper/core config." },
      ],
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
      "import-x/no-default-export": "error",
      "import-x/no-cycle": ["error", { maxDepth: 6 }],
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "object-shorthand": "error",
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 3],
      complexity: ["error", 12],
    },
  },
  {
    files: ["**/*.config.{ts,js,mjs}", "**/*.d.ts", "**/vitest.setup.ts"],
    rules: { "import-x/no-default-export": "off", "max-lines": "off" },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/test/**"],
    rules: {
      "max-lines": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
)
