import { networkError } from "../lib/api/errors"
import { appConfig } from "../lib/config"

const STATUS_UNAUTHORIZED = 401

const SESSION_PROBE_PATH = "/auth/me"

const JSON_CONTENT_TYPE = "application/json"

type SessionRefresh = () => Promise<boolean>

const probeSession: SessionRefresh = async () => {
  const response = await fetch(`${appConfig.apiUrl}${SESSION_PROBE_PATH}`, {
    credentials: "include",
    headers: { accept: JSON_CONTENT_TYPE },
  })
  return response.ok
}

const session: { refresh: SessionRefresh; inFlight: Promise<boolean> | null } = {
  refresh: probeSession,
  inFlight: null,
}

export const configureSessionRefresh = (refresh: SessionRefresh): void => {
  session.refresh = refresh
}

const runRefresh = async (): Promise<boolean> => {
  try {
    return await session.refresh()
  } catch {
    return false
  } finally {
    session.inFlight = null
  }
}

export const refreshSessionOnce = (): Promise<boolean> => {
  session.inFlight ??= runRefresh()
  return session.inFlight
}

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url

const send = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(input, init)
  } catch (error) {
    throw networkError(error)
  }
}

export const sessionFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const response = await send(input, init)

  if (response.status !== STATUS_UNAUTHORIZED) return response
  if (urlOf(input).includes(SESSION_PROBE_PATH)) return response

  const isRecovered = await refreshSessionOnce()
  if (!isRecovered) return response

  return send(input, init)
}
