import { useQuery } from "@tanstack/react-query"

import {
  CONNECTION_STATE,
  type ConnectionState,
} from "../../components/molecules/ConnectionIndicator"
import { useOnlineStatus } from "../../lib/browser"
import { appConfig } from "../../lib/config"

import { healthQueryOptions } from "./api"

const HEALTHY = "ok"

export interface ConnectionInputs {
  readonly online: boolean
  readonly hasError: boolean
  readonly serverStatus: string | undefined
}

export const deriveConnection = ({
  online,
  hasError,
  serverStatus,
}: ConnectionInputs): ConnectionState => {
  if (!online) return CONNECTION_STATE.offline
  if (hasError || serverStatus === undefined) return CONNECTION_STATE.reconnecting
  if (serverStatus !== HEALTHY) return CONNECTION_STATE.reconnecting
  return CONNECTION_STATE.connected
}

export interface AppStatusSnapshot {
  readonly version: string
  readonly commit: string
  readonly serverVersion: string | undefined
  readonly connection: ConnectionState
}

export const useAppStatus = (): AppStatusSnapshot => {
  const online = useOnlineStatus()
  const health = useQuery(healthQueryOptions())

  return {
    version: appConfig.version,
    commit: appConfig.commit,
    serverVersion: health.data?.version,
    connection: deriveConnection({
      online,
      hasError: health.isError,
      serverStatus: health.data?.status,
    }),
  }
}
