import { openapi } from "@elysiajs/openapi"
import { ROUTE } from "@scraper/core/constants"
import { JSONSchema } from "effect"

export const openapiPlugin = (version: string) =>
  openapi({
    path: ROUTE.docs,
    provider: "swagger-ui",
    mapJsonSchema: { effect: JSONSchema.make },
    documentation: {
      info: {
        title: "Scraper API",
        version,
        description: "Web scraping and change-monitoring platform API.",
      },
      servers: [{ url: ROUTE.apiBase }],
    },
  })
