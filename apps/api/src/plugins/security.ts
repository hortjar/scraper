import { cors } from "@elysiajs/cors"
import { HEADER, PLUGIN } from "@scraper/core/constants"
import { Elysia } from "elysia"

import { SECURITY_HEADER, SECURITY_HEADER_VALUE } from "./security.constants.js"

export interface SecurityPluginOptions {
  readonly corsOrigins: readonly string[]
}

export const securityPlugin = ({ corsOrigins }: SecurityPluginOptions) =>
  new Elysia({ name: PLUGIN.security })
    .use(
      cors({
        origin: (request) => {
          const origin = request.headers.get(HEADER.origin)
          return origin !== null && corsOrigins.includes(origin)
        },
        credentials: corsOrigins.length > 0,
      }),
    )
    .onRequest(({ set }) => {
      set.headers[SECURITY_HEADER.strictTransportSecurity] =
        SECURITY_HEADER_VALUE.strictTransportSecurity
      set.headers[SECURITY_HEADER.contentTypeOptions] = SECURITY_HEADER_VALUE.contentTypeOptions
      set.headers[SECURITY_HEADER.frameOptions] = SECURITY_HEADER_VALUE.frameOptions
      set.headers[SECURITY_HEADER.referrerPolicy] = SECURITY_HEADER_VALUE.referrerPolicy
      set.headers[SECURITY_HEADER.contentSecurityPolicy] =
        SECURITY_HEADER_VALUE.contentSecurityPolicy
    })
