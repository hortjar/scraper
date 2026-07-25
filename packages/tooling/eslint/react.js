import i18next from "eslint-plugin-i18next"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export const react = tseslint.config(
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      i18next,
    },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-text-only",
          "should-validate-template": true,
          message: "Every user-facing string is an i18n key (docs/16-I18N.md).",
          callees: { exclude: [".*"] },
          words: { exclude: ["^[^a-zA-Z]*$", "^\\s*$"] },
          "jsx-attributes": {
            include: ["title", "alt", "placeholder", "aria-label", "label", "description"],
          },
        },
      ],

      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='useEffect']",
          message:
            "useEffect is banned. See AGENTS.md §5 for the replacement table; effects live only in src/lib/browser.",
        },
        {
          selector: "CallExpression[callee.name='useLayoutEffect']",
          message:
            "useLayoutEffect is banned outside src/lib/browser. See AGENTS.md §5.",
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: "Use the clock helper from lib/format so tests can control time.",
        },
      ],

      "max-lines": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["apps/web/src/lib/browser/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["apps/web/src/routes/**/*.tsx", "apps/web/*.config.ts", "apps/web/src/main.tsx"],
    rules: { "import-x/no-default-export": "off" },
  },
  {
    files: ["apps/web/src/routes/**/*.tsx", "apps/web/src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["apps/web/src/i18n/**/*.ts", "apps/web/**/*.test.{ts,tsx}"],
    rules: { "i18next/no-literal-string": "off" },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: { "max-lines": ["error", { max: 300, skipBlankLines: true }] },
  },
  {
    files: ["apps/web/src/components/**/*.tsx", "apps/web/src/landing/**/*.tsx"],
    rules: { "max-lines": ["error", { max: 150, skipBlankLines: true }] },
  },
)
