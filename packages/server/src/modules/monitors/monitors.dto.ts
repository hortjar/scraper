import type { Extractor, Monitor } from "@scraper/core/domain"

import type { ExtractorDto, MonitorDetailDto, MonitorDto } from "./monitors.schema.js"

const iso = (value: Date): string => value.toISOString()

const isoOrNull = (value: Date | null): string | null => (value === null ? null : iso(value))

export const toMonitorDto = (monitor: Monitor): MonitorDto => ({
  id: monitor.id,
  name: monitor.name,
  url: monitor.url,
  engine: monitor.engine,
  engineResolved: monitor.engineResolved,
  schedule: monitor.schedule,
  jitterSeconds: monitor.jitterSeconds,
  enabled: monitor.enabled,
  status: monitor.status,
  consecutiveFailures: monitor.consecutiveFailures,
  contentSelector: monitor.contentSelector,
  respectRobots: monitor.respectRobots,
  tags: monitor.tags,
  lastRunAt: isoOrNull(monitor.lastRunAt),
  nextRunAt: isoOrNull(monitor.nextRunAt),
  lastChangeAt: isoOrNull(monitor.lastChangeAt),
  createdAt: iso(monitor.createdAt),
  updatedAt: iso(monitor.updatedAt),
})

export const toExtractorDto = (extractor: Extractor): ExtractorDto => ({
  id: extractor.id,
  key: extractor.key,
  label: extractor.label,
  selectorKind: extractor.selectorKind,
  selector: extractor.selector,
  attribute: extractor.attribute,
  valueType: extractor.valueType,
  occurrence: extractor.occurrence,
  occurrenceIndex: extractor.occurrenceIndex,
  required: extractor.required,
  position: extractor.position,
})

export const toMonitorDetailDto = (
  monitor: Monitor,
  extractors: readonly Extractor[],
): MonitorDetailDto => ({
  ...toMonitorDto(monitor),
  extractors: extractors.map((extractor) => toExtractorDto(extractor)),
})
