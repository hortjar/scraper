import { useTranslation } from "react-i18next"

import { Input } from "../../../components/ui/Input"
import { SCHEDULE_KIND, SCHEDULE_KINDS } from "../constants"
import { type FieldIssues, issueAt, schedulePath } from "../field-issues"
import { SCHEDULE_KIND_LABEL } from "../label-keys"
import type { ScheduleDraft } from "../monitor-form"
import { SCHEDULE_ACTION, type ScheduleAction } from "../monitor-form-reducer"

import { FormField } from "./FormField"
import { OptionSelect } from "./OptionSelect"

export interface SchedulePickerProperties {
  readonly schedule: ScheduleDraft
  readonly issues: FieldIssues
  readonly dispatch: (action: ScheduleAction) => void
}

export const SchedulePicker = ({ schedule, issues, dispatch }: SchedulePickerProperties) => {
  const { t } = useTranslation("monitors")
  const errorFor = (field: string): string | undefined => {
    const key = issueAt(issues, schedulePath(field))
    return key === undefined ? undefined : t(key, { defaultValue: key })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-ink">{t("schedule.label")}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="schedule-kind" label={t("schedule.kindLabel")}>
          <OptionSelect
            id="schedule-kind"
            value={schedule.kind}
            options={SCHEDULE_KINDS.map((kind) => ({
              value: kind,
              label: t(SCHEDULE_KIND_LABEL[kind]),
            }))}
            onChange={(value) => {
              dispatch({ type: SCHEDULE_ACTION.kind, value })
            }}
          />
        </FormField>

        {schedule.kind === SCHEDULE_KIND.cron ? (
          <FormField
            id="schedule-expression"
            label={t("schedule.expressionLabel")}
            hint={t("schedule.expressionHint")}
            error={errorFor("expression")}
          >
            <Input
              id="schedule-expression"
              value={schedule.expression}
              aria-invalid={errorFor("expression") !== undefined}
              className="font-mono text-mono-data"
              onChange={(event) => {
                dispatch({
                  type: SCHEDULE_ACTION.field,
                  field: "expression",
                  value: event.target.value,
                })
              }}
            />
          </FormField>
        ) : (
          <FormField
            id="schedule-interval"
            label={t("schedule.intervalSecondsLabel")}
            hint={t("schedule.intervalSecondsHint")}
            error={errorFor("intervalSeconds")}
          >
            <Input
              id="schedule-interval"
              type="number"
              min={1}
              value={schedule.intervalSeconds}
              aria-invalid={errorFor("intervalSeconds") !== undefined}
              onChange={(event) => {
                dispatch({
                  type: SCHEDULE_ACTION.field,
                  field: "intervalSeconds",
                  value: event.target.value,
                })
              }}
            />
          </FormField>
        )}

        <FormField
          id="schedule-timezone"
          label={t("schedule.timezoneLabel")}
          error={errorFor("timezone")}
        >
          <Input
            id="schedule-timezone"
            value={schedule.timezone}
            aria-invalid={errorFor("timezone") !== undefined}
            className="font-mono text-mono-data"
            onChange={(event) => {
              dispatch({
                type: SCHEDULE_ACTION.field,
                field: "timezone",
                value: event.target.value,
              })
            }}
          />
        </FormField>
      </div>
    </section>
  )
}
