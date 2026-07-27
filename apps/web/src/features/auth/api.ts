import { queryOptions } from "@tanstack/react-query"

import {
  getCurrentUserOptions,
  getCurrentUserQueryKey,
  listApiKeysOptions,
  listApiKeysQueryKey,
  listSessionsOptions,
  listSessionsQueryKey,
} from "../../api"
import { STALE_TIME } from "../../lib/api"

export const sessionQueryKey = getCurrentUserQueryKey()

export const sessionQueryOptions = () =>
  queryOptions({
    ...getCurrentUserOptions(),
    staleTime: STALE_TIME.detail,
  })

export const sessionsQueryKey = listSessionsQueryKey()

export const sessionsQueryOptions = () =>
  queryOptions({
    ...listSessionsOptions(),
    staleTime: STALE_TIME.list,
  })

export const apiKeysQueryKey = listApiKeysQueryKey()

export const apiKeysQueryOptions = () =>
  queryOptions({
    ...listApiKeysOptions(),
    staleTime: STALE_TIME.list,
  })
