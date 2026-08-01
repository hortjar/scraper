import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ElysiaAdapter } from "@bull-board/elysia"
import { HEADER, QUEUE, USER_ROLE } from "@scraper/core/constants"
import type { Queue } from "bullmq"
import { Effect, Either } from "effect"
import { Elysia, status } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import {
  assertAllowed,
  AUTH_HEADER,
  bearerFrom,
  makeRunAuthEither,
  readCookie,
  Sessions,
} from "../auth/index.js"

import {
  ADMIN_ACTION,
  ADMIN_PLUGIN,
  QUEUE_BOARD_BASE,
  QUEUE_BOARD_PREFIX,
} from "./admin.constants.js"

export type BoardQueues = Readonly<Record<string, Queue<never>>>

export interface QueueBoardOptions<R> extends AuthPluginOptions<R> {
  readonly queues: BoardQueues
}

const adminGuard = <R>({ runtime, config }: AuthPluginOptions<R>) =>
  new Elysia({ name: ADMIN_PLUGIN.queueGuard }).onBeforeHandle(
    { as: "scoped" },
    async ({ headers, set }) => {
      const outcome = await makeRunAuthEither(
        runtime,
        headers,
        set,
      )(
        Effect.gen(function* () {
          const sessions = yield* Sessions
          const actor = yield* sessions.authenticate({
            cookieToken: readCookie(headers[AUTH_HEADER.cookie], config.security.sessionCookieName),
            bearerToken: bearerFrom(headers[HEADER.authorization]),
          })
          yield* assertAllowed(actor, { role: USER_ROLE.admin, action: ADMIN_ACTION.queues })
          return actor
        }),
      )

      return Either.isLeft(outcome) ? status(outcome.left.status, outcome.left.body) : undefined
    },
  )

export const makeQueueBoard = async <R>(options: QueueBoardOptions<R>): Promise<Elysia> => {
  const adapter = new ElysiaAdapter({ prefix: QUEUE_BOARD_PREFIX, basePath: QUEUE_BOARD_BASE })

  createBullBoard({
    queues: Object.values(QUEUE).map((name) => new BullMQAdapter(options.queues[name] as Queue)),
    serverAdapter: adapter,
  })

  const plugin = await adapter.registerPlugin()

  return new Elysia({ name: ADMIN_PLUGIN.queues })
    .use(adminGuard(options))
    .use(plugin as unknown as Elysia)
}
