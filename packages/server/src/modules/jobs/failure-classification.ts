const RETRYABLE_WITHOUT_FLAG = new Set<string>(["DatabaseError", "QueueUnavailable"])

const tagOf = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("_tag" in error)) return undefined
  const tag = (error as { readonly _tag: unknown })._tag
  return typeof tag === "string" ? tag : undefined
}

const explicitRetryableFlag = (error: unknown): boolean | undefined => {
  if (typeof error !== "object" || error === null || !("retryable" in error)) return undefined
  const flag = (error as { readonly retryable: unknown }).retryable
  return typeof flag === "boolean" ? flag : undefined
}

export const isRetryableFailure = (error: unknown): boolean => {
  const tag = tagOf(error)
  if (tag !== undefined && RETRYABLE_WITHOUT_FLAG.has(tag)) return true

  const flag = explicitRetryableFlag(error)
  if (flag !== undefined) return flag

  return false
}

export const describeFailure = (error: unknown): string => {
  const tag = tagOf(error)
  if (tag !== undefined) return tag
  return error instanceof Error ? error.message : "unknown_failure"
}
