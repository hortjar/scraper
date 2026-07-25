import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/Tooltip"

import { hasVersionSkew } from "./AppVersion.skew"

export interface AppVersionProps {
  readonly version: string
  readonly commit: string
  readonly serverVersion?: string | undefined
  readonly onReload?: (() => void) | undefined
  readonly className?: string | undefined
}

export const AppVersion = ({
  version,
  commit,
  serverVersion,
  onReload,
  className,
}: AppVersionProps) => {
  const { t } = useTranslation("common")
  const skewed = hasVersionSkew(version, serverVersion)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-mono-micro text-ink-subtle tabular-nums" data-numeric>
            {t("version.client", { version, commit })}
          </p>
        </TooltipTrigger>
        <TooltipContent>
          {serverVersion === undefined
            ? t("version.apiUnknown")
            : t("version.api", { version: serverVersion })}
        </TooltipContent>
      </Tooltip>

      {skewed ? (
        <div className="rounded-md border border-line bg-brand-soft px-2 py-1.5">
          <p className="text-small font-medium text-brand-ink">{t("version.skewTitle")}</p>
          <p className="mt-0.5 text-small text-ink-muted">
            {t("version.skewDescription", { client: version, server: serverVersion })}
          </p>
          <Button variant="link" size="sm" className="mt-1 px-0" onClick={onReload}>
            {t("version.skewAction")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
