import { ExternalLinkIcon, ImageOffIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui"
import { appConfig } from "../../../lib/config"
import { cn } from "../../../lib/utils"

export interface RunScreenshotCardProperties {
  readonly screenshotUrl: string | null
  readonly className?: string
}

export const RunScreenshotCard = ({ screenshotUrl, className }: RunScreenshotCardProperties) => {
  const { t } = useTranslation("runs")

  if (screenshotUrl === null) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageOffIcon className="size-4 text-ink-subtle" aria-hidden="true" />
            {t("screenshot.emptyTitle")}
          </CardTitle>
          <CardDescription>{t("screenshot.emptyDescription")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const href = `${appConfig.apiUrl}${screenshotUrl}`

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("screenshot.title")}</CardTitle>
        <CardDescription>{t("screenshot.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-md border border-line bg-surface-sunken"
        >
          <img
            src={href}
            alt={t("screenshot.alt")}
            loading="lazy"
            className={cn(
              "max-h-[32rem] w-full object-cover object-top",
              "transition-opacity group-hover:opacity-90",
            )}
          />
        </a>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 self-start text-small text-ink-subtle hover:text-ink"
        >
          <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
          {t("screenshot.openFull")}
        </a>
      </CardContent>
    </Card>
  )
}
