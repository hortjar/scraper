import { appConfig } from "../lib/config"

import type { CreateClientConfig } from "./generated/client.gen"
import { sessionFetch } from "./session-fetch"

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: appConfig.apiUrl,
  credentials: "include",
  throwOnError: true,
  fetch: sessionFetch,
})
