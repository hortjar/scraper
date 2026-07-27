import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Label } from "../../../components/ui/Label"
import { Switch } from "../../../components/ui/Switch"
import { API_KEY_SCOPES, API_KEY_SCOPE_LABEL_KEY } from "../constants"
import type { ApiKeyScope } from "../types"
import type { ApiKeyField, ApiKeyFormValues, FieldErrors } from "../validation"

import { FieldError } from "./FieldError"
import { FormError } from "./FormError"

export interface CreateApiKeyFormProperties {
  readonly values: ApiKeyFormValues
  readonly errors: FieldErrors<ApiKeyField>
  readonly pending: boolean
  readonly submitError: unknown
  readonly onFieldChange: <K extends ApiKeyField>(field: K, value: ApiKeyFormValues[K]) => void
  readonly onToggleScope: (scope: ApiKeyScope, isEnabled: boolean) => void
  readonly onSubmit: () => void
}

export const CreateApiKeyForm = ({
  values,
  errors,
  pending,
  submitError,
  onFieldChange,
  onToggleScope,
  onSubmit,
}: CreateApiKeyFormProperties) => {
  const { t } = useTranslation("settings")

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <FormError error={submitError} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="api-key-name">{t("apiKeys.nameLabel")}</Label>
        <Input
          id="api-key-name"
          placeholder={t("apiKeys.namePlaceholder")}
          value={values.name}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name === undefined ? undefined : "api-key-name-error"}
          onChange={(event) => {
            onFieldChange("name", event.target.value)
          }}
        />
        <FieldError id="api-key-name-error" messageKey={errors.name} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-small font-medium text-ink">{t("apiKeys.scopesLabel")}</legend>
        {API_KEY_SCOPES.map((scope) => (
          <label key={scope} className="flex items-center justify-between gap-3 text-body text-ink">
            {t(API_KEY_SCOPE_LABEL_KEY[scope])}
            <Switch
              checked={values.scopes.includes(scope)}
              onCheckedChange={(checked) => {
                onToggleScope(scope, checked)
              }}
            />
          </label>
        ))}
        <FieldError id="api-key-scopes-error" messageKey={errors.scopes} />
      </fieldset>

      <Button type="submit" variant="primary" size="sm" className="self-start" disabled={pending}>
        {t(pending ? "apiKeys.creating" : "apiKeys.create")}
      </Button>
    </form>
  )
}
