export const CONNECTION_STATE = {
  connected: "connected",
  reconnecting: "reconnecting",
  offline: "offline",
} as const

export type ConnectionState = (typeof CONNECTION_STATE)[keyof typeof CONNECTION_STATE]
