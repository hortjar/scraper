import type { Extractor, Monitor } from "@scraper/core/domain"
import { ValidationFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"

import { MAX_IMPORT_MONITORS, MONITOR_EXPORT_VERSION } from "./monitors.constants.js"
import { toExtractorInput } from "./monitors.mappers.js"
import type { ImportMonitorsBody, MonitorConfigDto } from "./monitors.schema.js"

const IMPORT_PATH = ["monitors"] as const
const VERSION_FIELD = "version"

export const toConfigDocument = (
  monitor: Monitor,
  extractors: readonly Extractor[],
): MonitorConfigDto => ({
  version: MONITOR_EXPORT_VERSION,
  name: monitor.name,
  url: monitor.url,
  schedule: monitor.schedule,
  engine: monitor.engine,
  request: monitor.request,
  browserOptions: monitor.browserOptions,
  contentSelector: monitor.contentSelector,
  ignoreRules: monitor.ignoreRules,
  respectRobots: monitor.respectRobots,
  jitterSeconds: monitor.jitterSeconds,
  tags: monitor.tags,
  extractors: extractors.map((extractor) => toExtractorInput(extractor)),
})

export const importRejection = (documents: ImportMonitorsBody): ValidationFailed | null => {
  if (documents.length > MAX_IMPORT_MONITORS) {
    return new ValidationFailed({
      issues: [
        {
          path: IMPORT_PATH,
          messageKey: MSG.errors.validationFailed,
          params: { maximum: MAX_IMPORT_MONITORS },
        },
      ],
    })
  }

  const unsupported = documents.findIndex((document) => document.version !== MONITOR_EXPORT_VERSION)
  if (unsupported === -1) return null

  return new ValidationFailed({
    issues: [
      {
        path: [...IMPORT_PATH, String(unsupported), VERSION_FIELD],
        messageKey: MSG.errors.validationFailed,
        params: { expected: MONITOR_EXPORT_VERSION },
      },
    ],
  })
}
