import type { ToastKey } from "../label-keys"

export const NOTICE_TONE = { positive: "positive", negative: "negative" } as const

export type NoticeTone = (typeof NOTICE_TONE)[keyof typeof NOTICE_TONE]

export interface MonitorNoticeState {
  readonly tone: NoticeTone
  readonly titleKey: ToastKey
  readonly description?: string
}
