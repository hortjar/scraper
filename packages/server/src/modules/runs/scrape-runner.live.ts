import type { AppConfig } from "@scraper/core/config"
import { Effect, Layer } from "effect"

import {
  type JobProducer,
  type RateLimiter,
  type RedisClient,
  ScrapeRunner,
  type ScrapeJobPayload,
} from "../jobs/index.js"
import type { MonitorRepository } from "../monitors/index.js"
import type { DeliveryRepository, RuleRepository } from "../notifications/index.js"
import type {
  ContentNormalizer,
  Extraction,
  RobotsCache,
  StrategyRegistry,
  TransformPipeline,
  UrlGuard,
} from "../scraping/index.js"

import { runPipeline } from "./run-pipeline.js"
import type { RunRepository } from "./runs.repository.js"

export type RunPipelineServices =
  | AppConfig
  | ContentNormalizer
  | DeliveryRepository
  | Extraction
  | JobProducer
  | MonitorRepository
  | RateLimiter
  | RedisClient
  | RobotsCache
  | RuleRepository
  | RunRepository
  | StrategyRegistry
  | TransformPipeline
  | UrlGuard

export const ScrapeRunnerLive = Layer.effect(
  ScrapeRunner,
  Effect.map(Effect.context<RunPipelineServices>(), (context) =>
    ScrapeRunner.make({
      execute: (payload: ScrapeJobPayload, jobId: string | null) =>
        runPipeline({
          monitorId: payload.monitorId,
          trigger: payload.trigger,
          attempt: payload.attempt,
          jobId,
        }).pipe(Effect.asVoid, Effect.provide(context)),
    }),
  ),
)
