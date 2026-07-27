import { useState } from "react"

import { ErrorState } from "../../../components/organisms/ErrorState"
import { LoadingState } from "../../../components/organisms/LoadingState"
import { ApiKeyRevealDialog } from "../components/ApiKeyRevealDialog"
import { ApiKeysList } from "../components/ApiKeysList"
import { CreateApiKeyForm } from "../components/CreateApiKeyForm"
import type { ApiKeyScope, CreatedApiKey } from "../types"
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "../use-api-keys"
import { useFormFields } from "../use-form-fields"
import { type ApiKeyFormValues, hasFieldErrors, validateApiKeyForm } from "../validation"

const INITIAL_VALUES: ApiKeyFormValues = { name: "", scopes: [] }

export const ApiKeysSettingsContainer = () => {
  const apiKeys = useApiKeys()
  const creationMutation = useCreateApiKey()
  const revokeApiKey = useRevokeApiKey()
  const { values, setField, reset } = useFormFields(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [revealedKey, setRevealedKey] = useState<CreatedApiKey | undefined>(undefined)
  if (apiKeys.isPending) return <LoadingState rows={2} />
  if (apiKeys.isError) {
    return (
      <ErrorState
        error={apiKeys.error}
        onRetry={() => {
          void apiKeys.refetch()
        }}
      />
    )
  }

  const revokingId = revokeApiKey.isPending ? revokeApiKey.variables.path.apiKeyId : undefined
  const errors = submitted ? validateApiKeyForm(values) : {}

  const toggleScope = (scope: ApiKeyScope, isEnabled: boolean): void => {
    setField(
      "scopes",
      isEnabled ? [...values.scopes, scope] : values.scopes.filter((current) => current !== scope),
    )
  }

  const handleSubmit = (): void => {
    setSubmitted(true)
    if (hasFieldErrors(validateApiKeyForm(values))) return

    creationMutation.mutate(
      { body: { name: values.name.trim(), scopes: values.scopes as ApiKeyScope[] } },
      {
        onSuccess: (created) => {
          setRevealedKey(created)
          setSubmitted(false)
          reset(INITIAL_VALUES)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ApiKeysList
        apiKeys={apiKeys.data.items}
        revokingId={revokingId}
        onRevoke={(apiKeyId) => {
          revokeApiKey.mutate({ path: { apiKeyId } })
        }}
      />
      <CreateApiKeyForm
        values={values}
        errors={errors}
        pending={creationMutation.isPending}
        submitError={creationMutation.error}
        onFieldChange={setField}
        onToggleScope={toggleScope}
        onSubmit={handleSubmit}
      />
      <ApiKeyRevealDialog
        apiKeyValue={revealedKey?.key}
        onAcknowledge={() => {
          setRevealedKey(undefined)
        }}
      />
    </div>
  )
}
