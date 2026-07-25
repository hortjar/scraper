import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { PulseStrip } from "../components/organisms/PulseStrip"
import { Button } from "../components/ui/Button"

import { demoPulseTicks } from "./demo-pulse"

const HERO_TICK_COUNT = 32

export const LandingHero = () => {
  const { t } = useTranslation("landing")
  const ticks = demoPulseTicks(HERO_TICK_COUNT)

  return (
    <section className="mx-auto grid w-full max-w-app gap-section-sm px-6 py-section-md lg:grid-cols-2 lg:items-center">
      <div className="flex flex-col gap-5">
        <p className="eyebrow text-ink-subtle">{t("hero.eyebrow")}</p>
        <h1 className="display text-display-xl text-ink">{t("hero.title")}</h1>
        <p className="max-w-prose text-body text-ink-muted">{t("hero.body")}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="primary" size="lg">
            <Link to="/register">{t("hero.primaryCta")}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/login">{t("hero.secondaryCta")}</Link>
          </Button>
        </div>
      </div>

      <figure className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
        <PulseStrip ticks={ticks} size="hero" animateLatest />
        <figcaption className="eyebrow text-ink-subtle">{t("hero.pulseLabel")}</figcaption>
      </figure>
    </section>
  )
}
