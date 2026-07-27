export interface ChannelRow {
  readonly id: string
  readonly userId: string
  readonly kind: string
  readonly name: string
  readonly config: Record<string, unknown>
  readonly secret: Buffer | null
  readonly secretIv: Buffer | null
  readonly secretTag: Buffer | null
  readonly verifiedAt: Date | null
  readonly enabled: boolean
  readonly failureCount: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface EncryptedSecretColumns {
  readonly secret: Buffer
  readonly iv: Buffer
  readonly tag: Buffer
}

export interface ChannelPatch {
  readonly name?: string
  readonly config?: Record<string, unknown>
  readonly enabled?: boolean
  readonly secret?: EncryptedSecretColumns | null
}

export type ChannelSecretColumns = Pick<
  ChannelRow,
  "secret" | "secretIv" | "secretTag" | "verifiedAt"
>

export const timestampParameter = (value: Date | null): string | null =>
  value === null ? null : value.toISOString()

const asDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  return typeof value === "string" || typeof value === "number" ? new Date(value) : null
}

export const withHasSecret = (row: ChannelRow) => ({
  ...row,
  hasSecret: row.secret !== null,
  verifiedAt: asDate(row.verifiedAt),
  createdAt: asDate(row.createdAt),
  updatedAt: asDate(row.updatedAt),
})

export const mergeSecretColumns = (
  existing: ChannelSecretColumns,
  secret: EncryptedSecretColumns | null | undefined,
): ChannelSecretColumns =>
  secret === undefined
    ? {
        secret: existing.secret,
        secretIv: existing.secretIv,
        secretTag: existing.secretTag,
        verifiedAt: existing.verifiedAt,
      }
    : {
        secret: secret?.secret ?? null,
        secretIv: secret?.iv ?? null,
        secretTag: secret?.tag ?? null,
        verifiedAt: null,
      }

export const mergeChannelPatch = (existing: ChannelRow, patch: ChannelPatch) => ({
  name: patch.name ?? existing.name,
  config: patch.config ?? existing.config,
  enabled: patch.enabled ?? existing.enabled,
  ...mergeSecretColumns(existing, patch.secret),
})
