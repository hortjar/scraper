import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "../../../components/organisms/ErrorState"
import { Button } from "../../../components/ui/Button"
import {
  createMonitorMutationOptions,
  monitorListRootKey,
  monitorQueryKey,
  updateMonitorMutationOptions,
} from "../api"
import { ExtractorList } from "../components/ExtractorList"
import { IgnoreRulesBuilder } from "../components/IgnoreRulesBuilder"
import { MonitorBasicsForm } from "../components/MonitorBasicsForm"
import { SchedulePicker } from "../components/SchedulePicker"
import { hasIssues } from "../field-issues"
import { useMonitorForm } from "../hooks/use-monitor-form"
import { FORM_ACTION } from "../monitor-form-reducer"
import { toCreateBody, toUpdateBody } from "../monitor-payload"
import type { MonitorDetail } from "../types"

export interface MonitorEditorProperties {
  readonly monitor?: MonitorDetail
}

export const MonitorEditor = ({ monitor }: MonitorEditorProperties) => {
  const { t } = useTranslation("monitors")
  const { t: tCommon } = useTranslation("common")
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const create = useMutation(createMonitorMutationOptions())
  const update = useMutation(updateMonitorMutationOptions())
  const mutation = monitor === undefined ? create : update

  const form = useMonitorForm(monitor, mutation.error)

  const goToDetail = (monitorId: string) => {
    void queryClient.invalidateQueries({ queryKey: monitorListRootKey() })
    void queryClient.invalidateQueries({ queryKey: monitorQueryKey(monitorId) })
    void navigate({ to: "/monitors/$monitorId", params: { monitorId } })
  }

  const submit = () => {
    if (hasIssues(form.validate())) return

    if (monitor === undefined) {
      create.mutate(
        { body: toCreateBody(form.state) },
        {
          onSuccess: (created) => {
            goToDetail(created.id)
          },
        },
      )
      return
    }

    update.mutate(
      { path: { monitorId: monitor.id }, body: toUpdateBody(form.state) },
      {
        onSuccess: () => {
          goToDetail(monitor.id)
        },
      },
    )
  }

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <MonitorBasicsForm state={form.state} issues={form.issues} dispatch={form.dispatch} />

      <SchedulePicker
        schedule={form.state.schedule}
        issues={form.issues}
        dispatch={(action) => {
          form.dispatch({ type: FORM_ACTION.schedule, action })
        }}
      />

      <ExtractorList
        extractors={form.state.extractors}
        issues={form.issues}
        dispatch={(action) => {
          form.dispatch({ type: FORM_ACTION.extractors, action })
        }}
      />

      <IgnoreRulesBuilder
        rules={form.state.ignoreRules}
        issues={form.issues}
        dispatch={(action) => {
          form.dispatch({ type: FORM_ACTION.ignoreRules, action })
        }}
      />

      {monitor === undefined ? null : (
        <p className="text-small text-ink-subtle">{t("form.extractorsPreserved")}</p>
      )}

      {mutation.error === null ? null : (
        <ErrorState error={mutation.error} title={t("form.errorTitle")} />
      )}

      <div className="flex items-center gap-2 border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {t(monitor === undefined ? "form.submitCreate" : "form.submitUpdate")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            void navigate({ to: "/monitors" })
          }}
        >
          {tCommon("actions.cancel")}
        </Button>
      </div>
    </form>
  )
}
