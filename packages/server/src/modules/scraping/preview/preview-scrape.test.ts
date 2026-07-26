import {
  ExtractorId,
  MonitorId,
  newId,
  type Extractor,
  type MonitorConfig,
  type ScrapeResponse,
} from "@scraper/core"
import { AppConfig } from "@scraper/core/config"
import { Effect, Exit, Layer } from "effect"
import { describe, expect, it } from "vitest"

import { withTestConfig } from "../../../test-support/config.js"
import { Extraction } from "../extraction/extraction.service.js"
import { ContentNormalizer } from "../normalize/content-normalizer.service.js"
import { RobotsCache } from "../robots/robots-cache.service.js"
import { UrlGuard } from "../security/url-guard.service.js"
import { StrategyRegistry } from "../strategies/strategy-registry.service.js"
import type { ScrapeStrategy } from "../strategies/strategy.types.js"
import { TransformPipeline } from "../transforms/transform-pipeline.service.js"

import { previewScrape } from "./preview-scrape.js"

const okResponse = (html: string): ScrapeResponse => ({
  html,
  finalUrl: "http://93.184.216.34/",
  httpStatus: 200,
  headers: {},
  strategy: "http",
  timings: { totalMs: 5 },
})

const fakeStrategy = (kind: "http" | "browser", response: ScrapeResponse): ScrapeStrategy => ({
  kind,
  accepts: () => true,
  fetch: () => Effect.succeed(response),
})

const extractor = (overrides: Partial<Extractor>): Extractor => ({
  id: newId(ExtractorId),
  monitorId: newId(MonitorId),
  key: "field" as Extractor["key"],
  label: "Field",
  selectorKind: "css",
  selector: "",
  attribute: null,
  valueType: "text",
  transforms: [],
  occurrence: "first",
  occurrenceIndex: null,
  required: false,
  position: 0,
  ...overrides,
})

const monitor = (overrides: Partial<MonitorConfig>): MonitorConfig => ({
  id: newId(MonitorId),
  url: "http://93.184.216.34/" as MonitorConfig["url"],
  engine: "http",
  engineResolved: null,
  request: {},
  browserOptions: {},
  contentSelector: null,
  ignoreRules: [],
  respectRobots: false,
  extractors: [],
  ...overrides,
})

const AllowUrlGuard = Layer.succeed(
  UrlGuard,
  UrlGuard.make({ check: (url: string) => Effect.succeed(new URL(url)) }),
)

const AllowRobots = Layer.succeed(
  RobotsCache,
  RobotsCache.make({ check: () => Effect.succeed({ allowed: true, crawlDelaySeconds: null }) }),
)

const DisallowRobots = Layer.succeed(
  RobotsCache,
  RobotsCache.make({ check: () => Effect.succeed({ allowed: false, crawlDelaySeconds: null }) }),
)

const registryLayer = (http: ScrapeStrategy, browser: ScrapeStrategy) =>
  Layer.succeed(
    StrategyRegistry,
    StrategyRegistry.make({
      resolve: () => Effect.succeed(http),
      byKind: (kind) => (kind === "http" ? http : browser),
      http,
      browser,
    }),
  )

const pureLayers = Layer.mergeAll(
  Extraction.Default,
  TransformPipeline.Default,
  ContentNormalizer.Default,
)

const runPreview = (
  m: MonitorConfig,
  http: ScrapeStrategy,
  browser: ScrapeStrategy,
  robots = AllowRobots,
) => {
  const layers = Layer.mergeAll(
    AllowUrlGuard,
    robots,
    registryLayer(http, browser),
    pureLayers,
    AppConfig.Default,
  )
  return Effect.runPromiseExit(previewScrape(m).pipe(Effect.provide(layers), withTestConfig()))
}

describe("previewScrape", () => {
  it("extracts a field from the http response", async () => {
    const http = fakeStrategy("http", okResponse("<p class='x'>hello</p>"))
    const browser = fakeStrategy("browser", okResponse("<p class='x'>hello</p>"))
    const m = monitor({
      extractors: [
        extractor({ selectorKind: "css", selector: ".x", key: "field" as Extractor["key"] }),
      ],
    })

    const exit = await runPreview(m, http, browser)
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.strategyUsed).toBe("http")
      expect(exit.value.fields[0]?.valueText).toBe("hello")
      expect(exit.value.warnings).toEqual([])
    }
  })

  it("fails with ExtractorMissing when a required extractor has no match", async () => {
    const http = fakeStrategy("http", okResponse("<p>no match here</p>"))
    const browser = fakeStrategy("browser", okResponse("<p>no match here</p>"))
    const m = monitor({
      extractors: [extractor({ selectorKind: "css", selector: ".missing", required: true })],
    })

    const exit = await runPreview(m, http, browser)
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("ExtractorMissing")
    }
  })

  it("fails with RobotsDisallowed when robots.txt forbids the url", async () => {
    const http = fakeStrategy("http", okResponse("<p>hi</p>"))
    const browser = fakeStrategy("browser", okResponse("<p>hi</p>"))
    const m = monitor({ respectRobots: true })

    const exit = await runPreview(m, http, browser, DisallowRobots)
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("RobotsDisallowed")
    }
  })

  it("escalates from http to browser on a spa shell with a missing required extractor", async () => {
    const http = fakeStrategy("http", okResponse('<div id="root"></div>'))
    const browser = fakeStrategy("browser", okResponse('<p class="x">rendered</p>'))
    const m = monitor({
      engine: "auto",
      extractors: [extractor({ selectorKind: "css", selector: ".x", required: true })],
    })

    const exit = await runPreview(m, http, browser)
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.strategyUsed).toBe("browser")
      expect(exit.value.fields[0]?.valueText).toBe("rendered")
      expect(exit.value.warnings.length).toBe(1)
    }
  })

  it("does not escalate when the engine is pinned to http", async () => {
    const http = fakeStrategy("http", okResponse('<div id="root"></div>'))
    const browser = fakeStrategy("browser", okResponse("<p>should not be used</p>"))
    const m = monitor({
      engine: "http",
      extractors: [extractor({ selectorKind: "css", selector: ".x", required: true })],
    })

    const exit = await runPreview(m, http, browser)
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("ExtractorMissing")
    }
  })

  it("produces a normalized preview and content hash friendly text", async () => {
    const html = "<html><body><script>evil()</script><p>Visible text</p></body></html>"
    const http = fakeStrategy("http", okResponse(html))
    const browser = fakeStrategy("browser", okResponse(html))

    const exit = await runPreview(monitor({}), http, browser)
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.normalizedPreview).toBe("Visible text")
      expect(exit.value.screenshotRef).toBeNull()
    }
  })
})
