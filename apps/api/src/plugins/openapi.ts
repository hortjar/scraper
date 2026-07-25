import { openapi } from "@elysiajs/openapi"
import { ROUTE } from "@scraper/core/constants"
import { JSONSchema } from "effect"

export const openapiPlugin = openapi({
  path: ROUTE.docs,
  provider: "swagger-ui",
  mapJsonSchema: { effect: JSONSchema.make },
  documentation: {
    info: {
      title: "Scraper API",
      version: "0.1.0",
      description: "Web scraping and change-monitoring platform API.",
    },
  },
})
