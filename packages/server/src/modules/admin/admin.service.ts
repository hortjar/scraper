import { SERVICE_TAG, SPAN, USER_ROLE } from "@scraper/core/constants"
import type { UserRole } from "@scraper/core/domain"
import { NotAuthorized } from "@scraper/core/errors"
import { Effect } from "effect"

import { ADMIN_ACTION, RECENT_WINDOW_HOURS } from "./admin.constants.js"
import { AdminRepository, AdminRepositoryLive } from "./admin.repository.js"

export class Admin extends Effect.Service<Admin>()(SERVICE_TAG.Admin, {
  effect: Effect.gen(function* () {
    const repository = yield* AdminRepository

    const assertAdmin = (role: UserRole, action: string) =>
      role === USER_ROLE.admin ? Effect.void : Effect.fail(new NotAuthorized({ action }))

    const stats = Effect.fn(SPAN.admin.stats)(function* (role: UserRole) {
      yield* assertAdmin(role, ADMIN_ACTION.stats)

      const counts = yield* repository.stats()
      const queues = yield* repository.queueDepths()

      return { ...counts, queues, windowHours: RECENT_WINDOW_HOURS }
    })

    return { stats, assertAdmin } as const
  }),
  dependencies: [AdminRepositoryLive],
}) {}

export const AdminLive = Admin.Default
