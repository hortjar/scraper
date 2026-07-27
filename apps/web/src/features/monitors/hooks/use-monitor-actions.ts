import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  deleteMonitorMutationOptions,
  monitorListRootKey,
  monitorQueryKey,
  runMonitorNowMutationOptions,
} from "../api"
import { TOAST_KEY } from "../label-keys"

import type { MonitorNoticeController } from "./use-monitor-notice"

export interface MonitorActions {
  readonly runNow: (monitorId: string) => void
  readonly remove: (monitorId: string, onDone: () => void) => void
  readonly runPending: boolean
  readonly deletePending: boolean
}

export const useMonitorActions = (notice: MonitorNoticeController): MonitorActions => {
  const queryClient = useQueryClient()

  const invalidateLists = () => {
    void queryClient.invalidateQueries({ queryKey: monitorListRootKey() })
  }

  const runMutation = useMutation({
    ...runMonitorNowMutationOptions(),
    onSuccess: () => {
      notice.succeed(TOAST_KEY.runQueued)
      invalidateLists()
    },
    onError: (error) => {
      notice.fail(error)
    },
  })

  const monitorRemoval = useMutation({
    ...deleteMonitorMutationOptions(),
    onError: (error) => {
      notice.fail(error)
    },
  })

  return {
    runNow: (monitorId) => {
      runMutation.mutate({ path: { monitorId } })
    },
    remove: (monitorId, onDone) => {
      monitorRemoval.mutate(
        { path: { monitorId } },
        {
          onSuccess: () => {
            notice.succeed(TOAST_KEY.deleted)
            queryClient.removeQueries({ queryKey: monitorQueryKey(monitorId) })
            invalidateLists()
            onDone()
          },
        },
      )
    },
    runPending: runMutation.isPending,
    deletePending: monitorRemoval.isPending,
  }
}
