import { XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Toast, ToastClose, ToastDescription, ToastTitle } from "../../../components/ui/Toast"

import type { MonitorNoticeState } from "./MonitorNotice.constants"

export interface MonitorNoticeProperties {
  readonly notice: MonitorNoticeState | null
  readonly onDismiss: () => void
}

export const MonitorNotice = ({ notice, onDismiss }: MonitorNoticeProperties) => {
  const { t } = useTranslation("monitors")
  const { t: tCommon } = useTranslation("common")

  if (notice === null) return null

  return (
    <Toast
      tone={notice.tone}
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss()
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <ToastTitle>{t(notice.titleKey)}</ToastTitle>
        {notice.description === undefined ? null : (
          <ToastDescription>{notice.description}</ToastDescription>
        )}
      </div>
      <ToastClose aria-label={tCommon("actions.close")} className="shrink-0 text-ink-subtle">
        <XIcon className="size-4" aria-hidden="true" />
      </ToastClose>
    </Toast>
  )
}
