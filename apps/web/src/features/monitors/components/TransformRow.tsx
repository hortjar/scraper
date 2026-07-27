import { Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { TRANSFORM_KINDS } from "../constants"
import { TRANSFORM_FIELD_LABEL, TRANSFORM_KIND_LABEL } from "../label-keys"
import type { TransformDraft } from "../monitor-form"
import {
  TRANSFORM_FIELD,
  TRANSFORM_INPUT,
  type TransformValues,
  transformFields,
} from "../transforms"
import type { TransformKind } from "../types"

import { FormField } from "./FormField"
import { OptionSelect } from "./OptionSelect"

const TEXTAREA_CLASS = [
  "min-h-20 w-full rounded-md border border-line bg-surface px-3 py-1.5",
  "font-mono text-mono-data text-ink placeholder:text-ink-subtle",
  "transition-colors outline-none focus-visible:border-brand",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
].join(" ")

export interface TransformRowProperties {
  readonly transform: TransformDraft
  readonly onKindChange: (kind: TransformKind) => void
  readonly onValuesChange: (values: TransformValues) => void
  readonly onRemove: () => void
}

export const TransformRow = ({
  transform,
  onKindChange,
  onValuesChange,
  onRemove,
}: TransformRowProperties) => {
  const { t } = useTranslation("monitors")
  const specs = transformFields(transform.kind)

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-sunken px-3 py-3">
      <div className="flex items-end gap-2">
        <FormField
          id={`transform-${transform.id}-kind`}
          label={t("extractor.transformKindLabel")}
          className="flex-1"
        >
          <OptionSelect
            id={`transform-${transform.id}-kind`}
            value={transform.kind}
            options={TRANSFORM_KINDS.map((kind) => ({
              value: kind,
              label: t(TRANSFORM_KIND_LABEL[kind]),
            }))}
            onChange={onKindChange}
          />
        </FormField>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("actions.removeTransform")}
          onClick={onRemove}
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {specs.length === 0 ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          {specs.map((spec) => {
            const fieldId = `transform-${transform.id}-${spec.name}`
            const value = transform.values[spec.name] ?? ""

            return (
              <FormField
                key={spec.name}
                id={fieldId}
                label={t(TRANSFORM_FIELD_LABEL[spec.name])}
                className={spec.input === TRANSFORM_INPUT.mapping ? "sm:col-span-2" : undefined}
                hint={
                  spec.name === TRANSFORM_FIELD.mapping ? t("transform.mappingHint") : undefined
                }
              >
                {spec.input === TRANSFORM_INPUT.mapping ? (
                  <textarea
                    id={fieldId}
                    className={TEXTAREA_CLASS}
                    value={value}
                    onChange={(event) => {
                      onValuesChange({ ...transform.values, [spec.name]: event.target.value })
                    }}
                  />
                ) : (
                  <Input
                    id={fieldId}
                    type={spec.input === TRANSFORM_INPUT.number ? "number" : "text"}
                    value={value}
                    onChange={(event) => {
                      onValuesChange({ ...transform.values, [spec.name]: event.target.value })
                    }}
                  />
                )}
              </FormField>
            )
          })}
        </div>
      )}
    </div>
  )
}
