import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { PulseStrip } from "../organisms/PulseStrip"

export interface AuthShellProperties {
  readonly title: string
  readonly description: string
  readonly children: ReactNode
  readonly footer?: ReactNode
}

export const AuthShell = ({ title, description, children, footer }: AuthShellProperties) => {
  const { t } = useTranslation("common")

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col gap-3">
          <span className="display text-heading font-bold text-ink">{t("app.name")}</span>
          <PulseStrip ticks={[]} size="hero" className="h-10" />
        </div>

        <h1 className="text-title text-ink">{title}</h1>
        <p className="mt-1 text-body text-ink-muted">{description}</p>

        <div className="mt-6 rounded-lg border border-line bg-surface p-5">{children}</div>

        {footer === undefined ? null : (
          <div className="mt-4 text-small text-ink-muted">{footer}</div>
        )}
      </div>
    </div>
  )
}
