import { readFileSync } from "node:fs"
import process from "node:process"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const blankToUndefined = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim() ?? ""
  return trimmed === "" ? undefined : trimmed
}

export const readPackageVersion = (packageJsonUrl: URL): string | undefined => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(packageJsonUrl, "utf8"))
    if (!isRecord(parsed)) return undefined
    const { version } = parsed
    return typeof version === "string" ? blankToUndefined(version) : undefined
  } catch {
    return undefined
  }
}

export const resolveAppVersion = (
  packageJsonUrl: URL,
  override: string | undefined,
): string | undefined => blankToUndefined(override) ?? readPackageVersion(packageJsonUrl)

export const seedAppVersion = (packageJsonUrl: URL): void => {
  const version = resolveAppVersion(packageJsonUrl, process.env.APP_VERSION)
  if (version === undefined) {
    delete process.env.APP_VERSION
    return
  }
  process.env.APP_VERSION = version
}
