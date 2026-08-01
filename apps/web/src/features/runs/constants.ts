import { covering } from "./exhaustive"
import type { ChangeKind, DiffHunkKind, RunStatus, RunTrigger } from "./types"

export const RUN_STATUS = covering<RunStatus>()({
  queued: "queued",
  running: "running",
  success: "success",
  failed: "failed",
  skipped: "skipped",
})

export const RUN_TRIGGER = covering<RunTrigger>()({
  schedule: "schedule",
  manual: "manual",
  retry: "retry",
  test: "test",
})

export const CHANGE_KIND = covering<ChangeKind>()({
  appeared: "appeared",
  disappeared: "disappeared",
  modified: "modified",
  increased: "increased",
  decreased: "decreased",
})

export const DIFF_HUNK_KIND = covering<DiffHunkKind>()({
  added: "added",
  removed: "removed",
  unchanged: "unchanged",
})

export const NUMERIC_CHANGE_KINDS: ReadonlySet<ChangeKind> = new Set([
  CHANGE_KIND.increased,
  CHANGE_KIND.decreased,
])

export const EMPTY_VALUE_MARK = "—"
