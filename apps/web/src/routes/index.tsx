import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { MarketingShell } from "../components/layouts/MarketingShell"
import { LandingHero, LandingNotes, LandingSteps } from "../landing"

const LandingRoute = () => {
  const { t } = useTranslation("landing")

  return (
    <MarketingShell>
      <LandingHero />
      <LandingSteps />
      <LandingNotes />
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-app px-6 py-section-sm">
          <p className="text-small text-ink-subtle">{t("placeholder.notice")}</p>
        </div>
      </section>
    </MarketingShell>
  )
}

export const Route = createFileRoute("/")({ component: LandingRoute })
