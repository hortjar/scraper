import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG, SPAN, STORAGE_DRIVER } from "@scraper/core/constants"
import { DataCorruption, StorageUnavailable } from "@scraper/core/errors"
import { Effect, Redacted } from "effect"

import { localPathFor } from "./artifact-key.js"
import { makeS3Driver } from "./s3-driver.js"
import {
  ARTIFACT_ENTITY,
  DIRECTORY_MODE,
  FILE_NOT_FOUND,
  STORAGE_OPERATION,
} from "./storage.constants.js"

export type ArtifactFailure = DataCorruption | StorageUnavailable

export interface ArtifactDriver {
  readonly put: (
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ) => Effect.Effect<string, ArtifactFailure>
  readonly get: (key: string) => Effect.Effect<Uint8Array | null, ArtifactFailure>
}

const unavailable = (operation: string) => (cause: unknown) =>
  new StorageUnavailable({ operation, cause })

const isMissingFile = (cause: unknown): boolean =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  (cause as { readonly code: unknown }).code === FILE_NOT_FOUND

const rejectUnsafeKey = (key: string) =>
  Effect.fail(new DataCorruption({ entity: ARTIFACT_ENTITY, detail: key }))

const makeLocalDriver = (root: string): ArtifactDriver => ({
  put: (key, bytes) => {
    const target = localPathFor(root, key)
    if (target === null) return rejectUnsafeKey(key)
    return Effect.tryPromise({
      try: async () => {
        await mkdir(path.dirname(target), { recursive: true, mode: DIRECTORY_MODE })
        await writeFile(target, bytes)
        return key
      },
      catch: unavailable(STORAGE_OPERATION.put),
    })
  },
  get: (key) => {
    const target = localPathFor(root, key)
    if (target === null) return rejectUnsafeKey(key)
    return Effect.tryPromise({
      try: async () => {
        try {
          return new Uint8Array(await readFile(target))
        } catch (error) {
          if (isMissingFile(error)) return null
          throw error
        }
      },
      catch: unavailable(STORAGE_OPERATION.get),
    })
  },
})

export class ArtifactStore extends Effect.Service<ArtifactStore>()(SERVICE_TAG.ObjectStore, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const storage = config.storage

    const driver =
      storage.driver === STORAGE_DRIVER.s3
        ? makeS3Driver({
            bucket: storage.s3Bucket,
            region: storage.s3Region,
            endpoint: storage.s3Endpoint,
            accessKeyId: Redacted.value(storage.s3AccessKeyId),
            secretAccessKey: Redacted.value(storage.s3SecretAccessKey),
          })
        : makeLocalDriver(storage.localPath)

    const put = Effect.fn(SPAN.storage.put)(function* (
      key: string,
      bytes: Uint8Array,
      contentType: string,
    ) {
      return yield* driver.put(key, bytes, contentType)
    })

    const get = Effect.fn(SPAN.storage.get)(function* (key: string) {
      return yield* driver.get(key)
    })

    return { put, get } as const
  }),
  dependencies: [AppConfig.Default],
}) {}

export const ArtifactStoreLive = ArtifactStore.Default
