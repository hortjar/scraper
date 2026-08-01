import { useTranslation } from "react-i18next"

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "../../../components/ui"
import { CHANNEL_FIELD_TYPE, CHECKED_VALUE, UNCHECKED_VALUE } from "../constants"
import { fieldLabelKey } from "../label-keys"
import type { ChannelFieldResponse } from "../types"

export interface ChannelFieldInputProperties {
  readonly field: ChannelFieldResponse
  readonly value: string
  readonly hasStoredSecret: boolean
  readonly onChange: (name: string, value: string) => void
}

const INPUT_TYPE: Partial<Record<ChannelFieldResponse["type"], string>> = {
  [CHANNEL_FIELD_TYPE.number]: "number",
  [CHANNEL_FIELD_TYPE.secret]: "password",
  [CHANNEL_FIELD_TYPE.url]: "url",
}

export const ChannelFieldInput = ({
  field,
  value,
  hasStoredSecret,
  onChange,
}: ChannelFieldInputProperties) => {
  const { t } = useTranslation("channels")
  const id = `channel-field-${field.name}`

  if (field.type === CHANNEL_FIELD_TYPE.boolean) {
    return (
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id}>{t(fieldLabelKey(field.labelKey))}</Label>
        <Switch
          id={id}
          checked={value === CHECKED_VALUE}
          onCheckedChange={(checked) => {
            onChange(field.name, checked ? CHECKED_VALUE : UNCHECKED_VALUE)
          }}
        />
      </div>
    )
  }

  if (field.type === CHANNEL_FIELD_TYPE.select) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{t(fieldLabelKey(field.labelKey))}</Label>
        <Select
          value={value}
          onValueChange={(next) => {
            onChange(field.name, next)
          }}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={field.placeholder ?? ""} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t(fieldLabelKey(field.labelKey))}</Label>
      <Input
        id={id}
        type={INPUT_TYPE[field.type] ?? "text"}
        value={value}
        required={field.required && !(hasStoredSecret && field.secret)}
        placeholder={field.placeholder ?? ""}
        autoComplete={field.secret ? "new-password" : "off"}
        onChange={(event) => {
          onChange(field.name, event.target.value)
        }}
      />
      {hasStoredSecret && field.secret ? (
        <p className="text-small text-ink-subtle">{t("form.secretStored")}</p>
      ) : null}
    </div>
  )
}
