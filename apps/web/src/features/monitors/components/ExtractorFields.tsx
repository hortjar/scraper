import { useTranslation } from "react-i18next"

import { Input } from "../../../components/ui/Input"
import { Switch } from "../../../components/ui/Switch"
import { OCCURRENCES, OCCURRENCE, SELECTOR_KINDS, VALUE_TYPES } from "../constants"
import { type FieldIssues, extractorPath, issueAt } from "../field-issues"
import { OCCURRENCE_LABEL, SELECTOR_KIND_LABEL, VALUE_TYPE_LABEL } from "../label-keys"
import type { ExtractorDraft } from "../monitor-form"

import { FormField } from "./FormField"
import { OptionSelect } from "./OptionSelect"

export interface ExtractorFieldsProperties {
  readonly extractor: ExtractorDraft
  readonly index: number
  readonly issues: FieldIssues
  readonly onPatch: (patch: Partial<ExtractorDraft>) => void
}

export const ExtractorFields = ({
  extractor,
  index,
  issues,
  onPatch,
}: ExtractorFieldsProperties) => {
  const { t } = useTranslation("monitors")
  const base = `extractor-${extractor.id}`
  const errorFor = (field: string): string | undefined => {
    const key = issueAt(issues, extractorPath(index, field))
    return key === undefined ? undefined : t(key, { defaultValue: key })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField
        id={`${base}-key`}
        label={t("extractor.keyLabel")}
        hint={t("extractor.keyHint")}
        error={errorFor("key")}
      >
        <Input
          id={`${base}-key`}
          value={extractor.key}
          placeholder={t("extractor.keyPlaceholder")}
          aria-invalid={errorFor("key") !== undefined}
          onChange={(event) => {
            onPatch({ key: event.target.value })
          }}
        />
      </FormField>

      <FormField id={`${base}-label`} label={t("extractor.labelLabel")} error={errorFor("label")}>
        <Input
          id={`${base}-label`}
          value={extractor.label}
          placeholder={t("extractor.labelPlaceholder")}
          aria-invalid={errorFor("label") !== undefined}
          onChange={(event) => {
            onPatch({ label: event.target.value })
          }}
        />
      </FormField>

      <FormField id={`${base}-selectorKind`} label={t("extractor.selectorKindLabel")}>
        <OptionSelect
          id={`${base}-selectorKind`}
          value={extractor.selectorKind}
          options={SELECTOR_KINDS.map((kind) => ({
            value: kind,
            label: t(SELECTOR_KIND_LABEL[kind]),
          }))}
          onChange={(selectorKind) => {
            onPatch({ selectorKind })
          }}
        />
      </FormField>

      <FormField
        id={`${base}-selector`}
        label={t("extractor.selectorLabel")}
        error={errorFor("selector")}
      >
        <Input
          id={`${base}-selector`}
          value={extractor.selector}
          placeholder={t("extractor.selectorPlaceholder")}
          aria-invalid={errorFor("selector") !== undefined}
          className="font-mono text-mono-data"
          onChange={(event) => {
            onPatch({ selector: event.target.value })
          }}
        />
      </FormField>

      <FormField id={`${base}-valueType`} label={t("extractor.valueTypeLabel")}>
        <OptionSelect
          id={`${base}-valueType`}
          value={extractor.valueType}
          options={VALUE_TYPES.map((valueType) => ({
            value: valueType,
            label: t(VALUE_TYPE_LABEL[valueType]),
          }))}
          onChange={(valueType) => {
            onPatch({ valueType })
          }}
        />
      </FormField>

      <FormField id={`${base}-attribute`} label={t("extractor.attributeLabel")}>
        <Input
          id={`${base}-attribute`}
          value={extractor.attribute}
          placeholder={t("extractor.attributePlaceholder")}
          onChange={(event) => {
            onPatch({ attribute: event.target.value })
          }}
        />
      </FormField>

      <FormField id={`${base}-occurrence`} label={t("extractor.occurrenceLabel")}>
        <OptionSelect
          id={`${base}-occurrence`}
          value={extractor.occurrence}
          options={OCCURRENCES.map((occurrence) => ({
            value: occurrence,
            label: t(OCCURRENCE_LABEL[occurrence]),
          }))}
          onChange={(occurrence) => {
            onPatch({ occurrence })
          }}
        />
      </FormField>

      {extractor.occurrence === OCCURRENCE.nth ? (
        <FormField id={`${base}-occurrenceIndex`} label={t("extractor.occurrenceIndexLabel")}>
          <Input
            id={`${base}-occurrenceIndex`}
            type="number"
            min={0}
            value={extractor.occurrenceIndex}
            onChange={(event) => {
              onPatch({ occurrenceIndex: event.target.value })
            }}
          />
        </FormField>
      ) : null}

      <div className="flex items-center gap-3 sm:col-span-2">
        <Switch
          id={`${base}-required`}
          checked={extractor.required}
          onCheckedChange={(required) => {
            onPatch({ required })
          }}
        />
        <label htmlFor={`${base}-required`} className="text-small text-ink">
          {t("extractor.requiredLabel")}
        </label>
        <span className="text-small text-ink-subtle">{t("extractor.requiredHint")}</span>
      </div>
    </div>
  )
}
