import { sessionQueryOptions } from "./api"
import type { CurrentUser } from "./types"

export const LOGIN_PATH = "/login"

export interface SessionQueryClient {
  readonly ensureQueryData: (
    options: ReturnType<typeof sessionQueryOptions>,
  ) => Promise<CurrentUser>
}

export const checkSession = async (queryClient: SessionQueryClient): Promise<boolean> => {
  try {
    await queryClient.ensureQueryData(sessionQueryOptions())
    return true
  } catch {
    return false
  }
}

export const resolveAppGuardRedirect = (isAuthenticated: boolean): typeof LOGIN_PATH | null =>
  isAuthenticated ? null : LOGIN_PATH
