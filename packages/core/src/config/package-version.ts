import { readFileSync } from "node:fs"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const readPackageVersion = (packageJsonUrl: URL): string | undefined => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(packageJsonUrl, "utf8"))
    if (!isRecord(parsed)) return undefined
    const { version } = parsed
    return typeof version === "string" && version.trim() !== "" ? version : undefined
  } catch {
    return undefined
  }
}
