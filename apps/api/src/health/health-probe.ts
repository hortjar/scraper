import { Effect } from "effect"

export interface HealthProbe {
  readonly name: string
  readonly check: Effect.Effect<boolean>
}

export interface HealthProbeResult {
  readonly name: string
  readonly healthy: boolean
}

export const runHealthProbes = (
  probes: readonly HealthProbe[],
): Effect.Effect<readonly HealthProbeResult[]> =>
  Effect.all(
    probes.map((probe) =>
      probe.check.pipe(
        Effect.map((healthy): HealthProbeResult => ({ name: probe.name, healthy })),
        Effect.catchAllDefect(() => Effect.succeed({ name: probe.name, healthy: false })),
      ),
    ),
  )
