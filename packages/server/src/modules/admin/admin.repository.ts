import { QUEUE, RUN_STATUS, SERVICE_TAG, SPAN, USER_ROLE } from "@scraper/core/constants"
import type { QueueName } from "@scraper/core/constants"
import { Database, schema, withNumericColumns } from "@scraper/db"
import { and, count, eq, gt, sql } from "drizzle-orm"
import { Effect } from "effect"

import { QueueRegistry } from "../jobs/index.js"

import { COUNTED_STATES, RECENT_WINDOW } from "./admin.constants.js"

export interface QueueDepth {
  readonly name: QueueName
  readonly workers: number
  readonly waiting: number
  readonly active: number
  readonly delayed: number
  readonly failed: number
}

const recent = sql`now() - ${RECENT_WINDOW}::interval`

const asCount = (rows: readonly { readonly value: number }[]): number => rows[0]?.value ?? 0

const USER_COLUMNS = ["total", "admins"] as const
const MONITOR_COLUMNS = ["total", "enabled"] as const
const RUN_COLUMNS = ["total", "failed", "changed"] as const
const DELIVERY_COLUMNS = ["value"] as const

const counter = (rows: readonly Record<string, unknown>[], columns: readonly string[]) => {
  const converted = withNumericColumns(rows[0] ?? {}, columns)
  return (column: string): number => {
    const value = converted[column]
    return typeof value === "number" ? value : 0
  }
}

const numberedDeliveries = (
  rows: readonly { readonly status: string; readonly value: number }[],
): readonly { readonly status: string; readonly total: number }[] =>
  rows.map((row) => ({
    status: row.status,
    total: counter([row], DELIVERY_COLUMNS)("value"),
  }))

const asDepth = (
  counts: Readonly<Record<string, number>>,
): Omit<QueueDepth, "name" | "workers"> => ({
  waiting: counts.waiting ?? 0,
  active: counts.active ?? 0,
  delayed: counts.delayed ?? 0,
  failed: counts.failed ?? 0,
})

export class AdminRepository extends Effect.Service<AdminRepository>()(
  SERVICE_TAG.AdminRepository,
  {
    effect: Effect.gen(function* () {
      const database = yield* Database
      const queues = yield* QueueRegistry

      const userCounts = () =>
        database.query((executor) =>
          executor
            .select({
              total: count(),
              admins: sql<number>`count(*) filter (where ${schema.users.role} = ${USER_ROLE.admin})`,
            })
            .from(schema.users),
        )

      const monitorCounts = () =>
        database.query((executor) =>
          executor
            .select({
              total: count(),
              enabled: sql<number>`count(*) filter (where ${schema.monitors.enabled})`,
            })
            .from(schema.monitors)
            .where(sql`${schema.monitors.archivedAt} is null`),
        )

      const runCounts = () =>
        database.query((executor) =>
          executor
            .select({
              total: count(),
              failed: sql<number>`count(*) filter (where ${schema.runs.status} = ${RUN_STATUS.failed})`,
              changed: sql<number>`count(*) filter (where ${schema.runs.changed})`,
            })
            .from(schema.runs)
            .where(gt(schema.runs.startedAt, recent)),
        )

      const deliveryCounts = () =>
        database.query((executor) =>
          executor
            .select({ status: schema.notificationDeliveries.status, value: count() })
            .from(schema.notificationDeliveries)
            .groupBy(schema.notificationDeliveries.status),
        )

      const degradedCount = () =>
        database
          .query((executor) =>
            executor
              .select({ value: count() })
              .from(schema.monitors)
              .where(
                and(
                  sql`${schema.monitors.archivedAt} is null`,
                  eq(schema.monitors.status, "degraded"),
                ),
              ),
          )
          .pipe(Effect.map((rows) => asCount(rows)))

      const stats = Effect.fn(SPAN.admin.stats)(function* () {
        const users = counter(yield* userCounts(), USER_COLUMNS)
        const monitors = counter(yield* monitorCounts(), MONITOR_COLUMNS)
        const runs = counter(yield* runCounts(), RUN_COLUMNS)
        const degraded = yield* degradedCount()
        const deliveryRows = yield* deliveryCounts()

        return {
          users: { total: users("total"), admins: users("admins") },
          monitors: { total: monitors("total"), enabled: monitors("enabled"), degraded },
          runs: { total: runs("total"), failed: runs("failed"), changed: runs("changed") },
          deliveries: numberedDeliveries(deliveryRows),
        }
      })

      const depthFor = (name: QueueName) =>
        Effect.promise(async () => {
          const [counts, workers] = await Promise.all([
            queues[name].getJobCounts(...COUNTED_STATES),
            queues[name].getWorkersCount(),
          ])
          return { name, ...asDepth(counts), workers } satisfies QueueDepth
        })

      const queueDepths = Effect.fn(SPAN.admin.queues)(function* () {
        return yield* Effect.forEach(Object.values(QUEUE), (name) => depthFor(name))
      })

      return { stats, queueDepths } as const
    }),
    dependencies: [Database.Default, QueueRegistry.Default],
  },
) {}

export const AdminRepositoryLive = AdminRepository.Default
