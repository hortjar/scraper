import { queryOptions } from "@tanstack/react-query"

import {
  createChannelMutation,
  deleteChannelMutation,
  listChannelKindsOptions,
  listChannelsOptions,
  listChannelsQueryKey,
  listDeliveriesOptions,
  listDeliveriesQueryKey,
  listRulesOptions,
  listRulesQueryKey,
  retryDeliveryMutation,
  testChannelMutation,
  updateChannelMutation,
  type ListDeliveriesData,
  type Options,
} from "../../api"
import { STALE_TIME } from "../../lib/api"

export interface DeliveryListQuery {
  readonly ruleId?: string
  readonly channelId?: string
  readonly status?: string
}

const definedEntries = (query: DeliveryListQuery): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
  )

const deliveryRequest = (query: DeliveryListQuery): Options<ListDeliveriesData> =>
  ({ query: definedEntries(query) }) as Options<ListDeliveriesData>

export const channelListRootKey = () => listChannelsQueryKey()

export const channelListQueryOptions = () =>
  queryOptions({ ...listChannelsOptions(), staleTime: STALE_TIME.list })

export const channelKindsQueryOptions = () =>
  queryOptions({ ...listChannelKindsOptions(), staleTime: STALE_TIME.detail })

export const deliveryListRootKey = () => listDeliveriesQueryKey(deliveryRequest({}))

export const deliveryListQueryOptions = (query: DeliveryListQuery) =>
  queryOptions({ ...listDeliveriesOptions(deliveryRequest(query)), staleTime: STALE_TIME.list })

export const monitorRulesQueryKey = (monitorId: string) =>
  listRulesQueryKey({ path: { monitorId } })

export const monitorRulesQueryOptions = (monitorId: string) =>
  queryOptions({
    ...listRulesOptions({ path: { monitorId } }),
    staleTime: STALE_TIME.list,
  })

export const createChannelMutationOptions = () => createChannelMutation()

export const updateChannelMutationOptions = () => updateChannelMutation()

export const deleteChannelMutationOptions = () => deleteChannelMutation()

export const testChannelMutationOptions = () => testChannelMutation()

export const retryDeliveryMutationOptions = () => retryDeliveryMutation()
