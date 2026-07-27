import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { monitorListQueryOptions } from "../api"
import { DeleteMonitorDialog } from "../components/DeleteMonitorDialog"
import { MonitorFilters } from "../components/MonitorFilters"
import { MonitorNotice } from "../components/MonitorNotice"
import { MonitorsListStatus } from "../components/MonitorsListStatus"
import { MonitorsPagination } from "../components/MonitorsPagination"
import { MonitorsTable } from "../components/MonitorsTable"
import { useMonitorActions } from "../hooks/use-monitor-actions"
import { useMonitorNotice } from "../hooks/use-monitor-notice"
import { type MonitorsSearch, type MonitorsSearchPatch, toListQuery } from "../list-search"
import { asText } from "../nullable"

export interface MonitorsListProperties {
  readonly search: MonitorsSearch
}

const blankToUndefined = (value: string): string | undefined => (value === "" ? undefined : value)

export const MonitorsList = ({ search }: MonitorsListProperties) => {
  const navigate = useNavigate({ from: "/monitors" })
  const notice = useMonitorNotice()
  const actions = useMonitorActions(notice)

  const query = useQuery(monitorListQueryOptions(toListQuery(search)))

  const setSearch = (next: MonitorsSearchPatch) => {
    void navigate({
      search: (previous: MonitorsSearch) => ({ ...previous, cursor: undefined, ...next }),
    })
  }

  const monitors = query.data?.items ?? []
  const deleting = monitors.find((monitor) => monitor.id === search.deleting)

  return (
    <div className="flex flex-col gap-4">
      <MonitorFilters
        search={search.search ?? ""}
        tag={search.tag ?? ""}
        onSearchChange={(value) => {
          setSearch({ search: blankToUndefined(value) })
        }}
        onTagChange={(value) => {
          setSearch({ tag: blankToUndefined(value) })
        }}
        onClear={() => {
          setSearch({ search: undefined, tag: undefined })
        }}
      />

      <MonitorsListStatus
        isPending={query.isPending}
        isEmpty={monitors.length === 0}
        isFiltered={search.search !== undefined || search.tag !== undefined}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />

      {monitors.length === 0 ? null : (
        <>
          <MonitorsTable
            monitors={monitors}
            onRunNow={actions.runNow}
            onDelete={(monitorId) => {
              setSearch({ deleting: monitorId })
            }}
          />
          <MonitorsPagination
            count={monitors.length}
            hasPrevious={search.cursor !== undefined}
            nextCursor={asText(query.data?.nextCursor)}
            onStartOver={() => {
              setSearch({ cursor: undefined })
            }}
            onNext={(cursor) => {
              void navigate({ search: (previous: MonitorsSearch) => ({ ...previous, cursor }) })
            }}
          />
        </>
      )}

      <DeleteMonitorDialog
        monitorName={deleting?.name}
        pending={actions.deletePending}
        onCancel={() => {
          setSearch({ deleting: undefined })
        }}
        onConfirm={() => {
          if (deleting === undefined) return
          actions.remove(deleting.id, () => {
            setSearch({ deleting: undefined })
          })
        }}
      />

      <MonitorNotice notice={notice.notice} onDismiss={notice.dismiss} />
    </div>
  )
}
