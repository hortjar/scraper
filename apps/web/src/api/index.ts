import { fromEnvelope } from "../lib/api/errors"

import { client } from "./generated/client.gen"

client.interceptors.error.use((error, response) => fromEnvelope(response?.status ?? 0, error))

export * from "./generated"
export * from "./generated/@tanstack/react-query.gen"
export { configureSessionRefresh, refreshSessionOnce } from "./session-fetch"
