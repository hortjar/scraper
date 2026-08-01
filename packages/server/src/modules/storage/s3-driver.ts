import { HEADER, HTTP_STATUS } from "@scraper/core/constants"
import { StorageUnavailable } from "@scraper/core/errors"
import { AwsClient } from "aws4fetch"
import { Effect } from "effect"

import { AWS_SERVICE, HTTP_METHOD, STORAGE_OPERATION } from "./storage.constants.js"

export interface S3Settings {
  readonly bucket: string
  readonly region: string
  readonly endpoint: string
  readonly accessKeyId: string
  readonly secretAccessKey: string
}

export interface S3Driver {
  readonly put: (
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ) => Effect.Effect<string, StorageUnavailable>
  readonly get: (key: string) => Effect.Effect<Uint8Array | null, StorageUnavailable>
}

const DEFAULT_HOST = (region: string) => `https://s3.${region}.amazonaws.com`

export const objectUrl = (settings: S3Settings, key: string): string => {
  const base = settings.endpoint === "" ? DEFAULT_HOST(settings.region) : settings.endpoint
  return `${base.replace(/\/$/u, "")}/${settings.bucket}/${key}`
}

const unavailable = (operation: string) => (cause: unknown) =>
  new StorageUnavailable({ operation, cause })

export const makeS3Driver = (settings: S3Settings): S3Driver => {
  const client = new AwsClient({
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    region: settings.region,
    service: AWS_SERVICE.s3,
  })

  return {
    put: (key, bytes, contentType) =>
      Effect.tryPromise({
        try: async () => {
          const response = await client.fetch(objectUrl(settings, key), {
            method: HTTP_METHOD.put,
            body: bytes,
            headers: { [HEADER.contentType]: contentType },
          })
          if (!response.ok) {
            throw new Error(`${String(response.status)} ${await response.text()}`)
          }
          return key
        },
        catch: unavailable(STORAGE_OPERATION.put),
      }),
    get: (key) =>
      Effect.tryPromise({
        try: async () => {
          const response = await client.fetch(objectUrl(settings, key), {
            method: HTTP_METHOD.get,
          })
          if (response.status === HTTP_STATUS.notFound) return null
          if (!response.ok) {
            throw new Error(`${String(response.status)} ${await response.text()}`)
          }
          return new Uint8Array(await response.arrayBuffer())
        },
        catch: unavailable(STORAGE_OPERATION.get),
      }),
  }
}
