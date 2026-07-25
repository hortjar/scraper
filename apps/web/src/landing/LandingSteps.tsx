import { useTranslation } from "react-i18next"

const STEPS = [
  { number: "01", titleKey: "howItWorks.pointTitle", bodyKey: "howItWorks.pointBody" },
  { number: "02", titleKey: "howItWorks.extractTitle", bodyKey: "howItWorks.extractBody" },
  { number: "03", titleKey: "howItWorks.decideTitle", bodyKey: "howItWorks.decideBody" },
  { number: "04", titleKey: "howItWorks.tellTitle", bodyKey: "howItWorks.tellBody" },
] as const

export const LandingSteps = () => {
  const { t } = useTranslation("landing")

  return (
    <section className="border-t border-line">
      <div className="mx-auto w-full max-w-app px-6 py-section-md">
        <p className="eyebrow text-ink-subtle">{t("howItWorks.eyebrow")}</p>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.number} className="flex flex-col gap-2">
              <span className="font-mono text-mono-data text-brand tabular-nums" data-numeric>
                {step.number}
              </span>
              <h3 className="text-heading text-ink">{t(step.titleKey)}</h3>
              <p className="text-small text-ink-muted">{t(step.bodyKey)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
