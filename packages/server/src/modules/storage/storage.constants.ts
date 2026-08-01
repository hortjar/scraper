export const ARTIFACT_PREFIX = {
  screenshot: "screenshots",
} as const

export const KEY_SEPARATOR = "/"
export const SCREENSHOT_EXTENSION = ".png"
export const SCREENSHOT_CONTENT_TYPE = "image/png"

export const STORAGE_OPERATION = {
  put: "storage.put",
  get: "storage.get",
} as const

export const ARTIFACT_ENTITY = "artifact.key"
export const PARENT_SEGMENT = ".."
export const DIRECTORY_MODE = 0o755
