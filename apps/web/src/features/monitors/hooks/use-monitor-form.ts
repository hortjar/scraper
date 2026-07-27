import { type Dispatch, useReducer, useState } from "react"

import { resolveTimeZone } from "../../../lib/format"
import { type FieldIssues, mergeIssues, serverIssues } from "../field-issues"
import {
  type MonitorFormState,
  createMonitorFormState,
  monitorFormStateFrom,
} from "../monitor-form"
import { type MonitorFormAction, monitorFormReducer } from "../monitor-form-reducer"
import { validateMonitorForm } from "../monitor-validation"
import type { MonitorDetail } from "../types"

export interface MonitorFormController {
  readonly state: MonitorFormState
  readonly dispatch: Dispatch<MonitorFormAction>
  readonly issues: FieldIssues
  readonly validate: () => FieldIssues
}

const initialState = (detail: MonitorDetail | undefined): MonitorFormState => {
  const timezone = resolveTimeZone()
  return detail === undefined
    ? createMonitorFormState(timezone)
    : monitorFormStateFrom(detail, timezone)
}

export const useMonitorForm = (
  detail: MonitorDetail | undefined,
  error: unknown,
): MonitorFormController => {
  const [state, dispatch] = useReducer(monitorFormReducer, detail, initialState)
  const [checked, setChecked] = useState(false)

  const clientIssues = checked ? validateMonitorForm(state) : {}

  return {
    state,
    dispatch,
    issues: mergeIssues(serverIssues(error), clientIssues),
    validate: () => {
      setChecked(true)
      return validateMonitorForm(state)
    },
  }
}
