const HASH_ENCODING = "hex"

export const numeric = (value: number | null): string | null =>
  value === null ? null : String(value)

export const toDomainRun = (row: Record<string, unknown>): Record<string, unknown> => {
  const { contentHash, ...rest } = row
  return {
    ...rest,
    contentHash: Buffer.isBuffer(contentHash) ? contentHash.toString(HASH_ENCODING) : null,
  }
}

export const hashColumn = (value: string | undefined): Buffer | null =>
  value === undefined ? null : Buffer.from(value, HASH_ENCODING)

export const isoTimestamp = (value: Date): string => value.toISOString()
