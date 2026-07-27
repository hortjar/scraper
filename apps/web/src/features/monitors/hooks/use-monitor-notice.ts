import { useState } from "react"

import { useErrorMessage } from "../../../lib/api"
import { NOTICE_TONE, type MonitorNoticeState } from "../components/MonitorNotice.constants"
import { TOAST_KEY, type ToastKey } from "../label-keys"

export interface MonitorNoticeController {
  readonly notice: MonitorNoticeState | null
  readonly succeed: (titleKey: ToastKey) => void
  readonly fail: (error: unknown) => void
  readonly dismiss: () => void
}

export const useMonitorNotice = (): MonitorNoticeController => {
  const [notice, setNotice] = useState<MonitorNoticeState | null>(null)
  const describe = useErrorMessage()

  return {
    notice,
    succeed: (titleKey) => {
      setNotice({ tone: NOTICE_TONE.positive, titleKey })
    },
    fail: (error) => {
      setNotice({
        tone: NOTICE_TONE.negative,
        titleKey: TOAST_KEY.failed,
        description: describe(error),
      })
    },
    dismiss: () => {
      setNotice(null)
    },
  }
}
