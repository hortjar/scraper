import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Card, CardContent, CardHeader } from "../../../components/ui/Card"
import type { FieldIssues } from "../field-issues"
import type { ExtractorDraft } from "../monitor-form"
import { EXTRACTOR_ACTION, type ExtractorsAction } from "../monitor-form-reducer"

import { ExtractorFields } from "./ExtractorFields"
import { TransformRow } from "./TransformRow"

export interface ExtractorCardProperties {
  readonly extractor: ExtractorDraft
  readonly index: number
  readonly count: number
  readonly issues: FieldIssues
  readonly dispatch: (action: ExtractorsAction) => void
}

export const ExtractorCard = ({
  extractor,
  index,
  count,
  issues,
  dispatch,
}: ExtractorCardProperties) => {
  const { t } = useTranslation("monitors")
  const { id } = extractor

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <p className="eyebrow text-ink-subtle">
          {t("extractor.position", { position: index + 1 })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            aria-label={t("actions.moveExtractorUp")}
            onClick={() => {
              dispatch({ type: EXTRACTOR_ACTION.move, id, offset: -1 })
            }}
          >
            <ChevronUpIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === count - 1}
            aria-label={t("actions.moveExtractorDown")}
            onClick={() => {
              dispatch({ type: EXTRACTOR_ACTION.move, id, offset: 1 })
            }}
          >
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("actions.removeExtractor")}
            onClick={() => {
              dispatch({ type: EXTRACTOR_ACTION.remove, id })
            }}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ExtractorFields
          extractor={extractor}
          index={index}
          issues={issues}
          onPatch={(patch) => {
            dispatch({ type: EXTRACTOR_ACTION.update, id, patch })
          }}
        />

        <section className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-small font-medium text-ink">{t("extractor.transformsTitle")}</h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                dispatch({ type: EXTRACTOR_ACTION.addTransform, id })
              }}
            >
              <PlusIcon className="size-3.5" aria-hidden="true" />
              {t("actions.addTransform")}
            </Button>
          </div>

          {extractor.transforms.length === 0 ? (
            <p className="text-small text-ink-subtle">{t("extractor.transformsEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {extractor.transforms.map((transform) => (
                <TransformRow
                  key={transform.id}
                  transform={transform}
                  onKindChange={(kind) => {
                    dispatch({
                      type: EXTRACTOR_ACTION.updateTransform,
                      id,
                      transformId: transform.id,
                      patch: { kind, values: {} },
                    })
                  }}
                  onValuesChange={(values) => {
                    dispatch({
                      type: EXTRACTOR_ACTION.updateTransform,
                      id,
                      transformId: transform.id,
                      patch: { values },
                    })
                  }}
                  onRemove={() => {
                    dispatch({
                      type: EXTRACTOR_ACTION.removeTransform,
                      id,
                      transformId: transform.id,
                    })
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
