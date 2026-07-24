import { base, ignores } from "@scraper/tooling/eslint/base"
import { backend, configPackage } from "@scraper/tooling/eslint/backend"
import { react } from "@scraper/tooling/eslint/react"

export default [ignores, ...base, ...backend, ...configPackage, ...react]
