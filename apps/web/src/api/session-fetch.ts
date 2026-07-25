import { networkError } from "../lib/api/errors"
import { appConfig } from "../lib/config"

const STATUS_UNAUTHORIZED = 401

const SESSION_PROBE_PATH = "/auth/me"

const JSON_CONTENT_TYPE = "application/json"

type SessionRefresh = () => Promise<boolean>

const probeSession: SessionRefresh = async () => {
  const response = await globalThis.fetch(`${appConfig.apiUrl}${SESSION_PROBE_PATH}`, {
    credentials: "include",
    headers: { accept: JSON_CONTENT_TYPE },
  })
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

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url

const send = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    return await globalThis.fetch(input, init)
  } catch (cause) {
    throw networkError(cause)
  }
}

export const sessionFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const response = await send(input, init)

  if (response.status !== STATUS_UNAUTHORIZED) return response
  if (urlOf(input).includes(SESSION_PROBE_PATH)) return response

  const recovered = await refreshSessionOnce()
  if (!recovered) return response

  return send(input, init)
}
