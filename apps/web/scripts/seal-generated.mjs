import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { argv, exit } from "node:process"

const HEADER = "// @ts-nocheck"

const target = argv[2]

if (target === undefined) {
  console.error("usage: seal-generated.mjs <directory>")
  exit(1)
}

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else if (entry.name.endsWith(".ts")) {
      files.push(full)
    }
  }

  return files
}

const files = await walk(target)

let sealed = 0

for (const file of files) {
  const source = await readFile(file, "utf8")
  if (source.startsWith(HEADER)) continue
  await writeFile(file, `${HEADER}\n${source}`, "utf8")
  sealed += 1
}

console.log(`sealed ${sealed} of ${files.length} generated files`)
