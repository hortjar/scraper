import { PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { MONITOR_DEFAULTS } from "../constants"
import { FIELD_PATH, type FieldIssues, issueAt } from "../field-issues"
import type { ExtractorDraft } from "../monitor-form"
import { EXTRACTOR_ACTION, type ExtractorsAction } from "../monitor-form-reducer"

import { ExtractorCard } from "./ExtractorCard"

export interface ExtractorListProperties {
  readonly extractors: readonly ExtractorDraft[]
  readonly issues: FieldIssues
  readonly dispatch: (action: ExtractorsAction) => void
}

export const ExtractorList = ({ extractors, issues, dispatch }: ExtractorListProperties) => {
  const { t } = useTranslation("monitors")
  const listIssue = issueAt(issues, FIELD_PATH.extractors)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-heading text-ink">{t("extractor.title")}</h2>
          <p className="text-small text-ink-muted">{t("extractor.description")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={extractors.length >= MONITOR_DEFAULTS.extractorsMax}
          onClick={() => {
            dispatch({ type: EXTRACTOR_ACTION.add })
          }}
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          {t("actions.addExtractor")}
        </Button>
      </div>

      {listIssue === undefined ? null : (
        <p className="text-small text-negative-ink">{t(listIssue, { defaultValue: listIssue })}</p>
      )}

      {extractors.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-small text-ink-subtle">
          {t("extractor.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {extractors.map((extractor, index) => (
            <ExtractorCard
              key={extractor.id}
              extractor={extractor}
              index={index}
              count={extractors.length}
              issues={issues}
              dispatch={dispatch}
            />
          ))}
        </div>
      )}
    </section>
  )
}
