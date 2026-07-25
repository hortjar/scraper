import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { AppStatus } from "../../features/system"
import { Button } from "../ui/Button"

export interface MarketingShellProps {
  readonly children: ReactNode
}

export const MarketingShell = ({ children }: MarketingShellProps) => {
  const { t } = useTranslation("common")
  const { t: tLanding } = useTranslation("landing")

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-app items-center justify-between gap-6 px-6 py-4">
          <Link to="/" className="display text-heading font-bold text-ink">
            {t("app.name")}
          </Link>
          <nav aria-label={t("nav.label")} className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">{t("actions.signIn")}</Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link to="/register">{t("actions.signUp")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-app flex-wrap items-end justify-between gap-6 px-6 py-8">
          <p className="max-w-prose text-small text-ink-muted">{tLanding("footer.rights")}</p>
          <AppStatus className="items-start" />
        </div>
      </footer>
    </div>
  )
}
