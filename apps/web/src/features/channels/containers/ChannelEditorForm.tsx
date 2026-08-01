import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "../../../components/organisms"
import {
  channelListRootKey,
  createChannelMutationOptions,
  updateChannelMutationOptions,
} from "../api"
import { ChannelForm } from "../components/ChannelForm"
import { useChannelForm } from "../hooks/use-channel-form"
import { missingRequiredFields, toConfigPayload } from "../transforms"
import type { ChannelKindResponse, ChannelSummary } from "../types"

export interface ChannelEditorFormProperties {
  readonly kinds: readonly ChannelKindResponse[]
  readonly existing: ChannelSummary | undefined
}

export const ChannelEditorForm = ({ kinds, existing }: ChannelEditorFormProperties) => {
  const { t } = useTranslation("channels")
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const create = useMutation(createChannelMutationOptions())
  const update = useMutation(updateChannelMutationOptions())
  const mutation = existing === undefined ? create : update

  const form = useChannelForm(existing, kinds)
  const hasStoredSecret = existing?.hasSecret ?? false

  const goToList = () => {
    void queryClient.invalidateQueries({ queryKey: channelListRootKey() })
    void navigate({ to: "/channels" })
  }

  const submit = () => {
    const descriptor = form.descriptor
    if (descriptor === undefined) return
    if (missingRequiredFields(descriptor.fields, form.state.values, hasStoredSecret).length > 0) {
      return
    }

    const config = toConfigPayload(descriptor.fields, form.state.values)

    if (existing === undefined) {
      create.mutate(
        { body: { kind: form.state.kind, name: form.state.name, config } },
        { onSuccess: goToList },
      )
      return
    }

    update.mutate(
      {
        path: { channelId: existing.id },
        body: { name: form.state.name, enabled: form.state.isEnabled, config },
      },
      { onSuccess: goToList },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {mutation.isError ? (
        <ErrorState error={mutation.error} title={t("form.saveErrorTitle")} />
      ) : null}
      <ChannelForm
        kinds={kinds}
        selectedKind={form.state.kind}
        name={form.state.name}
        isEnabled={form.state.isEnabled}
        values={form.state.values}
        hasStoredSecret={hasStoredSecret}
        isKindLocked={existing !== undefined}
        isSubmitting={mutation.isPending}
        submitLabel={t(existing === undefined ? "actions.create" : "actions.save")}
        onKindChange={form.setKind}
        onNameChange={form.setName}
        onEnabledChange={form.setEnabled}
        onFieldChange={form.setField}
        onSubmit={submit}
      />
    </div>
  )
}
