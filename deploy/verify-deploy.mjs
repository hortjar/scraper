import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.argv[2]
const pkgPath = path.join(root, "package.json")

if (!existsSync(pkgPath)) {
  console.error(`verify-deploy: ${pkgPath} is missing`)
  process.exit(1)
}

const { exports: map = {} } = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(pkgPath, "utf8")))

const missing = Object.entries(map)
  .map(([subpath, target]) => [subpath, path.join(root, target)])
  .filter(([, file]) => !existsSync(file))

if (missing.length > 0) {
  console.error("verify-deploy: the deployed package is missing files its exports promise:")
  for (const [subpath, file] of missing) console.error(`  ${subpath} -> ${file}`)
  console.error("The image would fail at runtime with 'Cannot find module'. Refusing to build it.")
  process.exit(1)
}

console.log(`verify-deploy: all ${String(Object.keys(map).length)} exported subpaths present`)
