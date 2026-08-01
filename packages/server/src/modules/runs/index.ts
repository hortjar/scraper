import { Layer } from "effect"

import { ArtifactStore } from "../storage/index.js"

import { RunRepository } from "./runs.repository.js"
import { Runs } from "./runs.service.js"

export {
  CHANGE_ENTITY,
  FIELD_VALUE_ENTITY,
  RUN_ACTION,
  RUN_ENTITY,
  RUN_OPERATION_ID,
  RUN_PATH,
  RUN_PLUGIN,
  SNAPSHOT_ENTITY,
} from "./runs.constants.js"

export { diffField, diffWholePage, listDifference, percentChange } from "./diff/field-diff.js"
export type { ChangeDraft, FieldSnapshot } from "./diff/field-diff.js"
export { diffText, withContext } from "./diff/text-diff.js"

export { nextMonitorState } from "./monitor-state.js"
export type { MonitorState, RunOutcomeInput } from "./monitor-state.js"

export { isWithinQuietHours, localMinutesOfDay, minutesOfDay } from "./rules/quiet-hours.js"
export { evaluateRules } from "./rules/rule-evaluation.js"
export {
  decideDelivery,
  isHeldForLaterDelivery,
  isThrottled,
  messageHash,
} from "./rules/suppression.js"
export { matchTrigger } from "./rules/trigger-match.js"
export type { TriggerContext } from "./rules/trigger-match.js"

export { runPipeline } from "./run-pipeline.js"
export { storeScreenshot } from "./run-screenshot.js"
export {
  detailOf,
  draftFieldChanges,
  isOperatorFault,
  previousByKey,
} from "./run-pipeline.mappers.js"
export type { RunRequest } from "./run-pipeline.js"

export { ScrapeRunnerLive as RunsScrapeRunnerLive } from "./scrape-runner.live.js"
export type { RunPipelineServices } from "./scrape-runner.live.js"

export { toChangeDto, toRunDetailDto, toRunDto } from "./runs.dto.js"

export { RunRepository, RunRepositoryLive } from "./runs.repository.js"
export type {
  FieldValueInput,
  FinishRunInput,
  RunListFilter,
  StartRunInput,
} from "./runs.repository.types.js"

export { runRoutes, type RunServices } from "./runs.routes.js"

export {
  ChangeDto,
  ChangeListDto,
  RunDetailDto,
  RunDto,
  RunListDto,
  RunIdParameters,
} from "./runs.schema.js"

export { Runs, RunsLive } from "./runs.service.js"

export const RunsLayer = Layer.mergeAll(Runs.Default, RunRepository.Default, ArtifactStore.Default)
