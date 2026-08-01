import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const ROUTES_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const ROUTE_EXTENSION = ".tsx"
const OUTLET_MARKER = "<Outlet"

interface RouteFile {
  readonly id: string
  readonly source: string
  readonly hasChildren: boolean
}

const listDirectories = (directory: string): readonly string[] =>
  readdirSync(directory).filter((entry) => statSync(path.join(directory, entry)).isDirectory())

const collect = (directory: string, prefix: string): readonly RouteFile[] => {
  const entries = readdirSync(directory)
  const files = entries.filter((entry) => entry.endsWith(ROUTE_EXTENSION))
  const directories = new Set(listDirectories(directory))

  const here = files.map((file): RouteFile => {
    const name = file.slice(0, -ROUTE_EXTENSION.length)
    const hasFlatChildren = files.some((other) => other !== file && other.startsWith(`${name}.`))
    return {
      id: `${prefix}${file}`,
      source: readFileSync(path.join(directory, file), "utf8"),
      hasChildren: hasFlatChildren || directories.has(name),
    }
  })

  const nested = [...directories].flatMap((child) =>
    collect(path.join(directory, child), `${prefix}${child}/`),
  )

  return [...here, ...nested]
}

describe("route nesting", () => {
  const routes = collect(ROUTES_DIRECTORY, "")

  it("finds the route files", () => {
    expect(routes.length).toBeGreaterThan(10)
  })

  it.each(routes.filter((route) => route.hasChildren).map((route) => route.id))(
    "%s has children, so it must render an Outlet or they never appear",
    (id) => {
      const route = routes.find((candidate) => candidate.id === id)
      expect(route?.source).toContain(OUTLET_MARKER)
    },
  )
})
