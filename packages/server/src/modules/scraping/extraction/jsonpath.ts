import { JSONPATH_MAX_SEGMENTS } from "../scraping.constants.js"

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

type Token =
  | { readonly type: "key"; readonly key: string }
  | { readonly type: "index"; readonly index: number }
  | { readonly type: "wildcard" }

const TOKEN_PATTERN = /\.([A-Za-z0-9_]+)|\[(\*)\]|\[(\d+)\]|\['([^']+)'\]|\["([^"]+)"\]/g

const tokenize = (path: string): readonly Token[] => {
  const tokens: Token[] = []
  const body = path.startsWith("$") ? path.slice(1) : path
  for (const match of body.matchAll(TOKEN_PATTERN)) {
    if (match[1] !== undefined) tokens.push({ type: "key", key: match[1] })
    else if (match[2] !== undefined) tokens.push({ type: "wildcard" })
    else if (match[3] !== undefined) tokens.push({ type: "index", index: Number(match[3]) })
    else if (match[4] !== undefined) tokens.push({ type: "key", key: match[4] })
    else if (match[5] !== undefined) tokens.push({ type: "key", key: match[5] })
  }
  return tokens
}

const isPlainObject = (value: JsonValue): value is Record<string, JsonValue> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const applyToken = (values: readonly JsonValue[], token: Token): readonly JsonValue[] => {
  const results: JsonValue[] = []
  for (const value of values) {
    if (token.type === "wildcard") {
      if (Array.isArray(value)) results.push(...value)
      else if (isPlainObject(value)) results.push(...Object.values(value))
      continue
    }
    if (token.type === "index") {
      const item = Array.isArray(value) ? value[token.index] : undefined
      if (item !== undefined) results.push(item)
      continue
    }
    if (isPlainObject(value) && Object.hasOwn(value, token.key)) {
      results.push(value[token.key] as JsonValue)
    }
  }
  return results
}

export const queryJsonPath = (root: JsonValue, path: string): readonly JsonValue[] => {
  const tokens = tokenize(path)
  if (tokens.length > JSONPATH_MAX_SEGMENTS) return []
  if (tokens.length === 0) return [root]
  let values: readonly JsonValue[] = [root]
  for (const token of tokens) values = applyToken(values, token)
  return values
}
