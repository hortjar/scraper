import { BROWSER_STEP_KIND, ScrapeFailed, SPAN, STRATEGY, type BrowserStep } from "@scraper/core"
import { Clock, Duration, Effect, Redacted } from "effect"
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core"

import {
  DEFAULT_VIEWPORT,
  SCROLL_STEP_PIXELS,
  BROWSER_TOKEN_PARAMETER,
} from "../scraping.constants.js"
import type { ScrapeRequest } from "../scraping.schema.js"
import { checkUrl } from "../security/url-guard.js"

import type { ScrapeStrategy } from "./strategy.types.js"

export interface BrowserStrategyDependencies {
  readonly wsEndpoint: string
  readonly token: Redacted.Redacted
  readonly defaultTimeoutMs: number
  readonly blockResources: readonly string[]
  readonly screenshotsEnabled: boolean
  readonly blockedHostPatterns: readonly string[]
}

export const buildEndpoint = (wsEndpoint: string, token: Redacted.Redacted): string => {
  const value = Redacted.value(token)
  if (value === "") return wsEndpoint
  const url = new URL(wsEndpoint)
  url.searchParams.set(BROWSER_TOKEN_PARAMETER, value)
  return url.href
}

const connect = (endpoint: string, timeoutMs: number): Effect.Effect<Browser, ScrapeFailed> =>
  Effect.tryPromise({
    try: () => chromium.connectOverCDP(endpoint, { timeout: timeoutMs }),
    catch: (cause) =>
      new ScrapeFailed({ reason: "browser_unavailable", retryable: true, detail: String(cause) }),
  })

const openContext = (
  browser: Browser,
  viewport: { readonly width: number; readonly height: number },
): Effect.Effect<BrowserContext, ScrapeFailed> =>
  Effect.tryPromise({
    try: () => browser.newContext({ viewport }),
    catch: (cause) =>
      new ScrapeFailed({ reason: "browser_unavailable", retryable: true, detail: String(cause) }),
  })

const installResourceBlocking = (
  page: Page,
  blockResources: readonly string[],
): Effect.Effect<void, ScrapeFailed> =>
  blockResources.length === 0
    ? Effect.void
    : Effect.tryPromise({
        try: () =>
          page.route("**/*", (route) => {
            const resourceType = route.request().resourceType()
            if (blockResources.includes(resourceType)) {
              void route.abort()
            } else {
              void route.continue()
            }
          }),
        catch: (cause) =>
          new ScrapeFailed({ reason: "navigation", retryable: true, detail: String(cause) }),
      })

const timeoutOption = (
  timeoutMs: number | undefined,
): Record<string, never> | { readonly timeout: number } =>
  timeoutMs === undefined ? {} : { timeout: timeoutMs }

const runStep = (page: Page, step: BrowserStep): Effect.Effect<void, ScrapeFailed> =>
  Effect.tryPromise({
    try: async () => {
      const selector = step.selector ?? ""
      const options = timeoutOption(step.timeoutMs)
      switch (step.kind) {
        case BROWSER_STEP_KIND.click: {
          await page.click(selector, options)
          return
        }
        case BROWSER_STEP_KIND.fill: {
          await page.fill(selector, step.value ?? "", options)
          return
        }
        case BROWSER_STEP_KIND.select: {
          await page.selectOption(selector, step.value ?? "", options)
          return
        }
        case BROWSER_STEP_KIND.scroll: {
          await page.mouse.wheel(0, SCROLL_STEP_PIXELS)
          return
        }
        case BROWSER_STEP_KIND.waitFor: {
          if (step.selector === undefined) {
            await page.waitForTimeout(step.timeoutMs ?? 0)
          } else {
            await page.waitForSelector(step.selector, options)
          }
          return
        }
        default: {
          return step.kind satisfies never
        }
      }
    },
    catch: (cause) =>
      new ScrapeFailed({ reason: "navigation", retryable: false, detail: String(cause) }),
  })

const navigate = (
  page: Page,
  url: string,
  waitUntil: "load" | "domcontentloaded" | "networkidle",
  timeoutMs: number,
): Effect.Effect<
  { readonly status: number; readonly headers: Readonly<Record<string, string>> },
  ScrapeFailed
> =>
  Effect.tryPromise({
    try: async () => {
      const response = await page.goto(url, { waitUntil, timeout: timeoutMs })
      const headers = response ? await response.allHeaders() : {}
      return { status: response?.status() ?? 0, headers }
    },
    catch: (cause) =>
      new ScrapeFailed({ reason: "navigation", retryable: true, detail: String(cause) }),
  })

const capture = (
  page: Page,
  shouldCaptureScreenshot: boolean,
): Effect.Effect<{ readonly html: string; readonly screenshot?: Uint8Array }, ScrapeFailed> =>
  Effect.tryPromise({
    try: async () => {
      const html = await page.content()
      if (!shouldCaptureScreenshot) return { html }
      const buffer = await page.screenshot({ fullPage: true })
      return { html, screenshot: new Uint8Array(buffer) }
    },
    catch: (cause) =>
      new ScrapeFailed({ reason: "navigation", retryable: false, detail: String(cause) }),
  })

const runOnPage = (
  page: Page,
  request: ScrapeRequest,
  dependencies: BrowserStrategyDependencies,
  timeoutMs: number,
) =>
  Effect.gen(function* () {
    yield* installResourceBlocking(
      page,
      request.browserOptions.blockResources ?? dependencies.blockResources,
    )
    const navigation = yield* navigate(
      page,
      request.url,
      request.browserOptions.waitUntil ?? "load",
      timeoutMs,
    )

    yield* Effect.forEach(request.browserOptions.steps ?? [], (step) => runStep(page, step), {
      discard: true,
    })

    const waitForSelector = request.browserOptions.waitForSelector
    if (waitForSelector !== undefined) {
      yield* Effect.tryPromise({
        try: () => page.waitForSelector(waitForSelector, { timeout: timeoutMs }),
        catch: (cause) =>
          new ScrapeFailed({ reason: "navigation", retryable: false, detail: String(cause) }),
      })
    }
    const waitMs = request.browserOptions.waitMs
    if (waitMs !== undefined) {
      yield* Effect.tryPromise({
        try: () => page.waitForTimeout(waitMs),
        catch: (cause) =>
          new ScrapeFailed({ reason: "navigation", retryable: false, detail: String(cause) }),
      })
    }

    const isWantScreenshot =
      dependencies.screenshotsEnabled && (request.browserOptions.screenshot ?? false)
    const captured = yield* capture(page, isWantScreenshot)

    return { navigation, captured, finalUrl: page.url() }
  })

export const makeBrowserStrategy = (dependencies: BrowserStrategyDependencies): ScrapeStrategy => {
  const accepts: ScrapeStrategy["accepts"] = () => dependencies.wsEndpoint !== ""

  const fetch = Effect.fn(SPAN.scraping.fetch)(function* (request: ScrapeRequest) {
    yield* checkUrl(request.url, dependencies.blockedHostPatterns)

    if (dependencies.wsEndpoint === "") {
      return yield* Effect.fail(
        new ScrapeFailed({ reason: "browser_unavailable", retryable: false }),
      )
    }

    const timeoutMs = request.request.timeoutMs ?? dependencies.defaultTimeoutMs
    const endpoint = buildEndpoint(dependencies.wsEndpoint, dependencies.token)
    const startedAtMs = yield* Clock.currentTimeMillis
    const viewport = request.browserOptions.viewport ?? DEFAULT_VIEWPORT

    const result = yield* Effect.acquireUseRelease(
      connect(endpoint, timeoutMs).pipe(
        Effect.flatMap((browser) =>
          openContext(browser, viewport).pipe(Effect.map((context) => ({ browser, context }))),
        ),
      ),
      ({ context }) =>
        Effect.tryPromise({
          try: () => context.newPage(),
          catch: (cause) =>
            new ScrapeFailed({
              reason: "browser_unavailable",
              retryable: true,
              detail: String(cause),
            }),
        }).pipe(Effect.flatMap((page) => runOnPage(page, request, dependencies, timeoutMs))),
      ({ browser, context }) =>
        Effect.promise(() => context.close()).pipe(
          Effect.zipRight(Effect.promise(() => browser.close())),
        ),
    ).pipe(
      Effect.timeoutFail({
        duration: Duration.millis(timeoutMs),
        onTimeout: () => new ScrapeFailed({ reason: "timeout", retryable: true }),
      }),
    )

    const totalMs = (yield* Clock.currentTimeMillis) - startedAtMs

    return {
      html: result.captured.html,
      finalUrl: result.finalUrl,
      httpStatus: result.navigation.status,
      headers: result.navigation.headers,
      strategy: STRATEGY.browser,
      timings: { totalMs },
      ...(result.captured.screenshot !== undefined && { screenshot: result.captured.screenshot }),
    }
  })

  return { kind: STRATEGY.browser, accepts, fetch }
}
