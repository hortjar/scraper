import path from "node:path"

import { PATTERN } from "@scraper/core/constants"

import {
  ARTIFACT_PREFIX,
  KEY_SEPARATOR,
  PARENT_SEGMENT,
  SCREENSHOT_EXTENSION,
} from "./storage.constants.js"

export const screenshotKey = (monitorId: string, runId: string): string =>
  [ARTIFACT_PREFIX.screenshot, monitorId, `${runId}${SCREENSHOT_EXTENSION}`].join(KEY_SEPARATOR)

export const isSafeKey = (key: string): boolean => {
  if (key === "") return false
  return key
    .split(KEY_SEPARATOR)
    .every((segment) => segment !== PARENT_SEGMENT && PATTERN.artifactKeySegment.test(segment))
}

export const localPathFor = (root: string, key: string): string | null => {
  if (!isSafeKey(key)) return null
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, key)
  return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep) ? resolved : null
}
