export const prettier = {
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  arrowParens: "always",
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"],
  overrides: [
    { files: "*.md", options: { proseWrap: "preserve" } },
    { files: "*.json", options: { printWidth: 120 } },
  ],
}

export default prettier
