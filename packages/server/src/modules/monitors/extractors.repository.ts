import { SPAN } from "@scraper/core/constants"
import { Extractor } from "@scraper/core/domain"
import type { ExtractorId, MonitorId } from "@scraper/core/domain"
import { ExtractorNotFound } from "@scraper/core/errors"
import type { Database } from "@scraper/db"
import { constraintFailure, decodeRow, schema } from "@scraper/db"
import { and, eq, max } from "drizzle-orm"
import { Effect } from "effect"

import { EXTRACTOR_ENTITY } from "./monitors.constants.js"
import type { ExtractorInput, UpdateExtractorBody } from "./monitors.schema.js"

type ExtractorPatch = UpdateExtractorBody

const decodeExtractor = decodeRow(Extractor, EXTRACTOR_ENTITY)

const columnsFrom = (input: ExtractorInput) => ({
  key: input.key,
  label: input.label,
  selectorKind: input.selectorKind,
  selector: input.selector,
  attribute: input.attribute,
  valueType: input.valueType,
  transforms: [...input.transforms],
  occurrence: input.occurrence,
  occurrenceIndex: input.occurrenceIndex,
  required: input.required,
})

export const makeExtractorCrud = (database: Database) => {
  const nextPosition = (monitorId: MonitorId) =>
    database
      .query((executor) =>
        executor
          .select({ highest: max(schema.extractors.position) })
          .from(schema.extractors)
          .where(eq(schema.extractors.monitorId, monitorId)),
      )
      .pipe(Effect.map((rows) => (rows[0]?.highest ?? -1) + 1))

  const appendExtractor = Effect.fn(SPAN.monitors.update)(function* (
    monitorId: MonitorId,
    input: ExtractorInput,
  ) {
    const position = yield* nextPosition(monitorId)
    const rows = yield* database
      .query((executor) =>
        executor
          .insert(schema.extractors)
          .values({ monitorId, ...columnsFrom(input), position } as never)
          .returning(),
      )
      .pipe(Effect.mapError((error) => constraintFailure(error, EXTRACTOR_ENTITY)))
    const row = rows[0]
    if (row === undefined) return yield* Effect.fail(new ExtractorNotFound({ id: monitorId }))
    return yield* decodeExtractor(row)
  })

  const updateExtractor = Effect.fn(SPAN.monitors.update)(function* (
    monitorId: MonitorId,
    extractorId: ExtractorId,
    patch: ExtractorPatch,
  ) {
    const values = Object.fromEntries(
      Object.entries({
        ...(patch.key !== undefined && { key: patch.key }),
        ...(patch.label !== undefined && { label: patch.label }),
        ...(patch.selectorKind !== undefined && { selectorKind: patch.selectorKind }),
        ...(patch.selector !== undefined && { selector: patch.selector }),
        ...(patch.attribute !== undefined && { attribute: patch.attribute }),
        ...(patch.valueType !== undefined && { valueType: patch.valueType }),
        ...(patch.transforms !== undefined && { transforms: [...patch.transforms] }),
        ...(patch.occurrence !== undefined && { occurrence: patch.occurrence }),
        ...(patch.occurrenceIndex !== undefined && { occurrenceIndex: patch.occurrenceIndex }),
        ...(patch.required !== undefined && { required: patch.required }),
      }),
    )

    const rows = yield* database
      .query((executor) =>
        executor
          .update(schema.extractors)
          .set(values)
          .where(
            and(eq(schema.extractors.id, extractorId), eq(schema.extractors.monitorId, monitorId)),
          )
          .returning(),
      )
      .pipe(Effect.mapError((error) => constraintFailure(error, EXTRACTOR_ENTITY)))
    const row = rows[0]
    if (row === undefined) return yield* Effect.fail(new ExtractorNotFound({ id: extractorId }))
    return yield* decodeExtractor(row)
  })

  const removeExtractor = Effect.fn(SPAN.monitors.update)(function* (
    monitorId: MonitorId,
    extractorId: ExtractorId,
  ) {
    const rows = yield* database.query((executor) =>
      executor
        .delete(schema.extractors)
        .where(
          and(eq(schema.extractors.id, extractorId), eq(schema.extractors.monitorId, monitorId)),
        )
        .returning({ id: schema.extractors.id }),
    )
    if (rows.length === 0) return yield* Effect.fail(new ExtractorNotFound({ id: extractorId }))
  })

  return { appendExtractor, updateExtractor, removeExtractor } as const
}
