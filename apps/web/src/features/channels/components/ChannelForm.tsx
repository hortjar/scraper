import type { SyntheticEvent } from "react"
import { useTranslation } from "react-i18next"

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "../../../components/ui"
import type { ChannelFormValues, ChannelKindResponse } from "../types"

import { ChannelFieldInput } from "./ChannelFieldInput"

export interface ChannelFormProperties {
  readonly kinds: readonly ChannelKindResponse[]
  readonly selectedKind: string
  readonly name: string
  readonly isEnabled: boolean
  readonly values: ChannelFormValues
  readonly hasStoredSecret: boolean
  readonly isKindLocked: boolean
  readonly isSubmitting: boolean
  readonly submitLabel: string
  readonly onKindChange: (kind: string) => void
  readonly onNameChange: (name: string) => void
  readonly onEnabledChange: (isEnabled: boolean) => void
  readonly onFieldChange: (name: string, value: string) => void
  readonly onSubmit: () => void
}

export const ChannelForm = ({
  kinds,
  selectedKind,
  name,
  isEnabled,
  values,
  hasStoredSecret,
  isKindLocked,
  isSubmitting,
  submitLabel,
  onKindChange,
  onNameChange,
  onEnabledChange,
  onFieldChange,
  onSubmit,
}: ChannelFormProperties) => {
  const { t } = useTranslation("channels")
  const descriptor = kinds.find((kind) => kind.kind === selectedKind)

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("form.basicsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-name">{t("form.nameLabel")}</Label>
            <Input
              id="channel-name"
              value={name}
              required
              onChange={(event) => {
                onNameChange(event.target.value)
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-kind">{t("form.kindLabel")}</Label>
            <Select value={selectedKind} onValueChange={onKindChange} disabled={isKindLocked}>
              <SelectTrigger id="channel-kind">
                <SelectValue placeholder={t("form.kindPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((kind) => (
                  <SelectItem key={kind.kind} value={kind.kind}>
                    {kind.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isKindLocked ? (
              <p className="text-small text-ink-subtle">{t("form.kindLocked")}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="channel-enabled">{t("form.enabledLabel")}</Label>
            <Switch id="channel-enabled" checked={isEnabled} onCheckedChange={onEnabledChange} />
          </div>
        </CardContent>
      </Card>

      {descriptor === undefined ? null : (
        <Card>
          <CardHeader>
            <CardTitle>{descriptor.displayName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {descriptor.fields.map((field) => (
              <ChannelFieldInput
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                hasStoredSecret={hasStoredSecret}
                onChange={onFieldChange}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isSubmitting || selectedKind === ""}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
