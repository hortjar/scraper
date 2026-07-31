import type { Extractor, MonitorConfig, MonitorId } from "@scraper/core/domain"

import { PREVIEW_MONITOR_ID } from "./monitors.constants.js"
import type { ExtractorInput, PreviewMonitorBody } from "./monitors.schema.js"

export const toExtractorInput = (extractor: Extractor): ExtractorInput => ({
  key: extractor.key,
  label: extractor.label,
  selectorKind: extractor.selectorKind,
  selector: extractor.selector,
  attribute: extractor.attribute,
  valueType: extractor.valueType,
  transforms: extractor.transforms,
  occurrence: extractor.occurrence,
  occurrenceIndex: extractor.occurrenceIndex,
  required: extractor.required,
})

const toPreviewExtractor = (input: ExtractorInput, position: number): Extractor => ({
  id: PREVIEW_MONITOR_ID as Extractor["id"],
  monitorId: PREVIEW_MONITOR_ID as MonitorId,
  key: input.key,
  label: input.label,
  selectorKind: input.selectorKind,
  selector: input.selector,
  attribute: input.attribute,
  valueType: input.valueType,
  transforms: input.transforms,
  occurrence: input.occurrence,
  occurrenceIndex: input.occurrenceIndex,
  required: input.required,
  position,
})

export const toPreviewConfig = (input: PreviewMonitorBody): MonitorConfig => ({
  id: PREVIEW_MONITOR_ID as MonitorId,
  url: input.url,
  engine: input.engine,
  engineResolved: null,
  request: input.request,
  browserOptions: input.browserOptions,
  contentSelector: input.contentSelector,
  ignoreRules: input.ignoreRules,
  respectRobots: input.respectRobots,
  extractors: input.extractors.map((extractor, index) => toPreviewExtractor(extractor, index)),
})
