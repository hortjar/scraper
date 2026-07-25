import { appConfig } from "../config"

import { ApiError, fromEnvelope, networkError } from "./errors"
import type { QueryParams } from "./types"

const STATUS_UNAUTHORIZED = 401
const STATUS_NO_CONTENT = 204

const SESSION_PROBE_PATH = "/auth/me"

const JSON_CONTENT_TYPE = "application/json"

export interface RequestOptions {
  readonly method?: string
  readonly body?: unknown
  readonly query?: QueryParams
  readonly signal?: AbortSignal
  readonly headers?: Readonly<Record<string, string>>
}

const buildUrl = (path: string, query?: QueryParams): string => {
  const base = `${appConfig.apiUrl}${path}`
  if (!query) return base

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    search.set(key, String(value))
  }
  const serialised = search.toString()
  return serialised.length > 0 ? `${base}?${serialised}` : base
}

const send = async (path: string, options: RequestOptions): Promise<Response> => {
  const hasBody = options.body !== undefined
  const init: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      accept: JSON_CONTENT_TYPE,
      ...(hasBody ? { "content-type": JSON_CONTENT_TYPE } : {}),
      ...options.headers,
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  }

  try {
    return await fetch(buildUrl(path, options.query), init)
  } catch (cause) {
    throw networkError(cause)
  }
}

const readBody = async (response: Response): Promise<unknown> => {
  if (response.status === STATUS_NO_CONTENT) return undefined
  const text = await response.text()
  if (text.length === 0) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

const parse = async <T>(response: Response): Promise<T> => {
  const body = await readBody(response)
  if (!response.ok) throw fromEnvelope(response.status, body)
  return body as T
}

type SessionRefresh = () => Promise<boolean>

const probeSession: SessionRefresh = async () => {
  const response = await send(SESSION_PROBE_PATH, {})
  return response.ok
}

let refreshSession: SessionRefresh = probeSession
let inFlight: Promise<boolean> | null = null

export const configureSessionRefresh = (refresh: SessionRefresh): void => {
  refreshSession = refresh
}

export const refreshSessionOnce = (): Promise<boolean> => {
  if (inFlight === null) {
    inFlight = refreshSession().catch(() => false)
    void inFlight.finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await send(path, options)
  if (response.status !== STATUS_UNAUTHORIZED || path === SESSION_PROBE_PATH) {
    return parse<T>(response)
  }

  const recovered = await refreshSessionOnce()
  if (!recovered) throw fromEnvelope(response.status, await readBody(response))

  return parse<T>(await send(path, options))
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
} as const

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError"

export { ApiError }
