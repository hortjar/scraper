import { useState } from "react"

import { toFormValues } from "../transforms"
import type { ChannelFormValues, ChannelKindResponse, ChannelSummary } from "../types"

export interface ChannelFormState {
  readonly kind: string
  readonly name: string
  readonly isEnabled: boolean
  readonly values: ChannelFormValues
}

const initialState = (channel: ChannelSummary | undefined): ChannelFormState => ({
  kind: channel?.kind ?? "",
  name: channel?.name ?? "",
  isEnabled: channel?.enabled ?? true,
  values: {},
})

export const useChannelForm = (
  channel: ChannelSummary | undefined,
  kinds: readonly ChannelKindResponse[],
) => {
  const [state, setState] = useState<ChannelFormState>(() => initialState(channel))
  const [hydratedKind, setHydratedKind] = useState<string | null>(null)

  const descriptor = kinds.find((kind) => kind.kind === state.kind)

  if (descriptor !== undefined && hydratedKind !== descriptor.kind) {
    setHydratedKind(descriptor.kind)
    setState((current) => ({
      ...current,
      values: toFormValues(descriptor.fields, channel?.config ?? {}),
    }))
  }

  return {
    state,
    descriptor,
    setKind: (kind: string) => {
      setState((current) => ({ ...current, kind }))
    },
    setName: (name: string) => {
      setState((current) => ({ ...current, name }))
    },
    setEnabled: (isEnabled: boolean) => {
      setState((current) => ({ ...current, isEnabled }))
    },
    setField: (name: string, value: string) => {
      setState((current) => ({ ...current, values: { ...current.values, [name]: value } }))
    },
  }
}
