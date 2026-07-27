import { useTranslation } from "react-i18next"

import { Input } from "../../../components/ui/Input"
import { Switch } from "../../../components/ui/Switch"
import { MONITOR_ENGINES } from "../constants"
import { FIELD_PATH, type FieldIssues, issueAt } from "../field-issues"
import { ENGINE_LABEL } from "../label-keys"
import type { MonitorFormState } from "../monitor-form"
import { FORM_ACTION, type MonitorFormAction } from "../monitor-form-reducer"

import { FormField } from "./FormField"
import { OptionSelect } from "./OptionSelect"

export interface MonitorBasicsFormProperties {
  readonly state: MonitorFormState
  readonly issues: FieldIssues
  readonly dispatch: (action: MonitorFormAction) => void
}

export const MonitorBasicsForm = ({ state, issues, dispatch }: MonitorBasicsFormProperties) => {
  const { t } = useTranslation("monitors")
  const errorFor = (field: string): string | undefined => {
    const key = issueAt(issues, field)
    return key === undefined ? undefined : t(key, { defaultValue: key })
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-heading text-ink">{t("form.basicsTitle")}</h2>
        <p className="text-small text-ink-muted">{t("form.basicsDescription")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="monitor-name" label={t("form.nameLabel")} error={errorFor(FIELD_PATH.name)}>
          <Input
            id="monitor-name"
            value={state.name}
            placeholder={t("form.namePlaceholder")}
            aria-invalid={errorFor(FIELD_PATH.name) !== undefined}
            onChange={(event) => {
              dispatch({ type: FORM_ACTION.field, field: "name", value: event.target.value })
            }}
          />
        </FormField>

        <FormField id="monitor-url" label={t("form.urlLabel")} error={errorFor(FIELD_PATH.url)}>
          <Input
            id="monitor-url"
            type="url"
            value={state.url}
            placeholder={t("form.urlPlaceholder")}
            aria-invalid={errorFor(FIELD_PATH.url) !== undefined}
            className="font-mono text-mono-data"
            onChange={(event) => {
              dispatch({ type: FORM_ACTION.field, field: "url", value: event.target.value })
            }}
          />
        </FormField>

        <FormField id="monitor-engine" label={t("engine.label")} hint={t("engine.hint")}>
          <OptionSelect
            id="monitor-engine"
            value={state.engine}
            options={MONITOR_ENGINES.map((engine) => ({
              value: engine,
              label: t(ENGINE_LABEL[engine]),
            }))}
            onChange={(value) => {
              dispatch({ type: FORM_ACTION.engine, value })
            }}
          />
        </FormField>

        <FormField
          id="monitor-content-selector"
          label={t("form.contentSelectorLabel")}
          hint={t("form.contentSelectorHint")}
        >
          <Input
            id="monitor-content-selector"
            value={state.contentSelector}
            placeholder={t("form.contentSelectorPlaceholder")}
            className="font-mono text-mono-data"
            onChange={(event) => {
              dispatch({
                type: FORM_ACTION.field,
                field: "contentSelector",
                value: event.target.value,
              })
            }}
          />
        </FormField>

        <FormField
          id="monitor-tags"
          label={t("form.tagsLabel")}
          hint={t("form.tagsHint")}
          className="sm:col-span-2"
        >
          <Input
            id="monitor-tags"
            value={state.tags}
            placeholder={t("form.tagsPlaceholder")}
            onChange={(event) => {
              dispatch({ type: FORM_ACTION.field, field: "tags", value: event.target.value })
            }}
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
        <div className="flex items-center gap-3">
          <Switch
            id="monitor-enabled"
            checked={state.enabled}
            onCheckedChange={(value) => {
              dispatch({ type: FORM_ACTION.flag, field: "enabled", value })
            }}
          />
          <label htmlFor="monitor-enabled" className="text-small text-ink">
            {t("form.enabledLabel")}
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="monitor-respect-robots"
            checked={state.respectRobots}
            onCheckedChange={(value) => {
              dispatch({ type: FORM_ACTION.flag, field: "respectRobots", value })
            }}
          />
          <label htmlFor="monitor-respect-robots" className="text-small text-ink">
            {t("form.respectRobotsLabel")}
          </label>
        </div>
      </div>
    </section>
  )
}
