import { catalogs, fallbackLocale } from "../src/i18n/index.js"
import { MSG } from "../src/i18n/keys.js"

const flatten = (node: unknown): string[] =>
  typeof node === "string"
    ? [node]
    : Object.values(node as Record<string, unknown>).flatMap((child) => flatten(child))

const declaredKeys = new Set(flatten(MSG))
const source = catalogs[fallbackLocale]
const sourceKeys = new Set(Object.keys(source))

const problems: string[] = []

for (const key of declaredKeys) {
  if (!sourceKeys.has(key)) problems.push(`missing in ${fallbackLocale}: ${key}`)
}

for (const key of sourceKeys) {
  if (!declaredKeys.has(key)) problems.push(`not declared in MSG: ${key}`)
}

for (const [locale, catalog] of Object.entries(catalogs)) {
  if (locale === fallbackLocale) continue
  for (const key of sourceKeys) {
    if (!Object.hasOwn(catalog, key)) problems.push(`missing in ${locale}: ${key}`)
  }
  for (const key of Object.keys(catalog)) {
    if (!sourceKeys.has(key)) problems.push(`orphaned in ${locale}: ${key}`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) globalThis.console.error(problem)
  globalThis.console.error(`\n${String(problems.length)} i18n problems`)
  process.exit(1)
}

globalThis.console.log(
  `i18n ok: ${String(sourceKeys.size)} keys across ${String(Object.keys(catalogs).length)} locales`,
)
