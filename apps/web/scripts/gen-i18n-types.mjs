import { readdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const i18nDir = resolve(here, "..", "src", "i18n")
const sourceLocaleDir = join(i18nDir, "locales", "en")
const outputPath = join(i18nDir, "i18next.d.ts")

const namespaces = readdirSync(sourceLocaleDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/u, ""))
  .sort()

if (namespaces.length === 0) {
  throw new Error(`No source catalogs found in ${sourceLocaleDir}`)
}

const defaultNamespace = namespaces.includes("common") ? "common" : namespaces[0]

const imports = namespaces
  .map((ns) => `import type ${ns} from "./locales/en/${ns}.json"`)
  .join("\n")

const members = namespaces.map((ns) => `      ${ns}: typeof ${ns}`).join("\n")

const contents = `${imports}

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "${defaultNamespace}"
    returnNull: false
    resources: {
${members}
    }
  }
}

export {}
`

writeFileSync(outputPath, contents, "utf8")
