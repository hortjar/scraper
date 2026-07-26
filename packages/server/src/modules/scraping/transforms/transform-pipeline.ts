import { TRANSFORM_KIND, TransformFailed, type ExtractorKey, type Transform } from "@scraper/core"
import { Effect, Either } from "effect"

import { applyStep } from "./transform-steps.js"

const findDefaultValue = (steps: readonly Transform[]): string | null => {
  for (const step of steps) {
    if (step.kind === TRANSFORM_KIND.defaultValue) return step.value
  }
  return null
}

const applyStepEffect = (
  extractorKey: ExtractorKey,
  value: string,
  step: Transform,
): Effect.Effect<string, TransformFailed> => {
  const result = applyStep(value, step)
  return Either.isRight(result)
    ? Effect.succeed(result.right)
    : Effect.fail(new TransformFailed({ extractorKey, transform: step.kind, detail: result.left }))
}

export const runTransforms = (
  extractorKey: ExtractorKey,
  raw: string | null,
  steps: readonly Transform[],
): Effect.Effect<string, TransformFailed> => {
  const seed = raw ?? findDefaultValue(steps)
  if (seed === null) {
    return Effect.fail(
      new TransformFailed({
        extractorKey,
        transform: TRANSFORM_KIND.defaultValue,
        detail: "no_value_and_no_default",
      }),
    )
  }

  let pipeline: Effect.Effect<string, TransformFailed> = Effect.succeed(seed)
  for (const step of steps) {
    pipeline = pipeline.pipe(Effect.flatMap((value) => applyStepEffect(extractorKey, value, step)))
  }
  return pipeline
}
