import { useTranslation } from "react-i18next"

const SECTIONS = [
  {
    id: "restraint",
    eyebrowKey: "restraint.eyebrow",
    titleKey: "restraint.title",
    bodyKey: "restraint.body",
  },
  {
    id: "selfHost",
    eyebrowKey: "selfHost.eyebrow",
    titleKey: "selfHost.title",
    bodyKey: "selfHost.body",
  },
] as const

export const LandingNotes = () => {
  const { t } = useTranslation("landing")

  return (
    <section className="border-t border-line">
      <div className="mx-auto grid w-full max-w-app gap-section-sm px-6 py-section-md md:grid-cols-2">
        {SECTIONS.map((section) => (
          <article key={section.id} className="flex flex-col gap-3">
            <p className="eyebrow text-ink-subtle">{t(section.eyebrowKey)}</p>
            <h2 className="display text-display-l text-ink">{t(section.titleKey)}</h2>
            <p className="max-w-prose text-body text-ink-muted">{t(section.bodyKey)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
