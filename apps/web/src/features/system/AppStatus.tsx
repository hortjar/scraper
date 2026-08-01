import { AppVersion } from "../../components/molecules/AppVersion"
import { ConnectionIndicator } from "../../components/molecules/ConnectionIndicator"
import { cn } from "../../lib/utils"

import { useAppStatus } from "./use-app-status"

export interface AppStatusProperties {
  readonly className?: string
}

const reload = () => {
  location.reload()
}

export const AppStatus = ({ className }: AppStatusProperties) => {
  const status = useAppStatus()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ConnectionIndicator state={status.connection} />
      <AppVersion
        version={status.version}
        commit={status.commit}
        serverVersion={status.serverVersion}
        serverBuiltAt={status.serverBuiltAt}
        onReload={reload}
      />
    </div>
  )
}
