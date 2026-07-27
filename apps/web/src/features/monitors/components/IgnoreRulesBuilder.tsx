import { PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { IGNORE_RULE_KINDS, MONITOR_DEFAULTS } from "../constants"
import { type FieldIssues, ignoreRulePath, issueAt } from "../field-issues"
import { IGNORE_RULE_KIND_LABEL } from "../label-keys"
import type { IgnoreRuleDraft } from "../monitor-form"
import { IGNORE_RULE_ACTION, type IgnoreRulesAction } from "../monitor-form-reducer"

import { FormField } from "./FormField"
import { OptionSelect } from "./OptionSelect"

export interface IgnoreRulesBuilderProperties {
  readonly rules: readonly IgnoreRuleDraft[]
  readonly issues: FieldIssues
  readonly dispatch: (action: IgnoreRulesAction) => void
}

export const IgnoreRulesBuilder = ({ rules, issues, dispatch }: IgnoreRulesBuilderProperties) => {
  const { t } = useTranslation("monitors")

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-heading text-ink">{t("ignoreRules.title")}</h2>
          <p className="text-small text-ink-muted">{t("ignoreRules.description")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={rules.length >= MONITOR_DEFAULTS.ignoreRulesMax}
          onClick={() => {
            dispatch({ type: IGNORE_RULE_ACTION.add })
          }}
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          {t("actions.addIgnoreRule")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="text-small text-ink-subtle">{t("ignoreRules.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((rule, index) => {
            const issueKey = issueAt(issues, ignoreRulePath(index, "value"))
            const error =
              issueKey === undefined ? undefined : t(issueKey, { defaultValue: issueKey })

            return (
              <div key={rule.id} className="flex items-end gap-2">
                <FormField
                  id={`ignore-${rule.id}-kind`}
                  label={t("ignoreRules.kindLabel")}
                  className="w-40 shrink-0"
                >
                  <OptionSelect
                    id={`ignore-${rule.id}-kind`}
                    value={rule.kind}
                    options={IGNORE_RULE_KINDS.map((kind) => ({
                      value: kind,
                      label: t(IGNORE_RULE_KIND_LABEL[kind]),
                    }))}
                    onChange={(kind) => {
                      dispatch({ type: IGNORE_RULE_ACTION.update, id: rule.id, patch: { kind } })
                    }}
                  />
                </FormField>

                <FormField
                  id={`ignore-${rule.id}-value`}
                  label={t("ignoreRules.valueLabel")}
                  className="flex-1"
                  error={error}
                >
                  <Input
                    id={`ignore-${rule.id}-value`}
                    value={rule.value}
                    placeholder={t("ignoreRules.valuePlaceholder")}
                    aria-invalid={error !== undefined}
                    className="font-mono text-mono-data"
                    onChange={(event) => {
                      dispatch({
                        type: IGNORE_RULE_ACTION.update,
                        id: rule.id,
                        patch: { value: event.target.value },
                      })
                    }}
                  />
                </FormField>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("actions.removeIgnoreRule")}
                  onClick={() => {
                    dispatch({ type: IGNORE_RULE_ACTION.remove, id: rule.id })
                  }}
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
