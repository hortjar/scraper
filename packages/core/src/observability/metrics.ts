import { Metric, MetricBoundaries } from "effect"

import { METRIC } from "../constants/telemetry.js"

export const metrics = {
  jobsProcessed: Metric.counter(METRIC.jobsProcessed),
  jobDuration: Metric.histogram(
    METRIC.jobDuration,
    MetricBoundaries.exponential({ start: 0.05, factor: 2, count: 12 }),
  ),
  queueDepth: Metric.gauge(METRIC.queueDepth),
  scrapeBytes: Metric.counter(METRIC.scrapeBytes),
  scrapeDuration: Metric.histogram(
    METRIC.scrapeDuration,
    MetricBoundaries.exponential({ start: 0.05, factor: 2, count: 12 }),
  ),
  changesDetected: Metric.counter(METRIC.changesDetected),
  notificationsSent: Metric.counter(METRIC.notificationsSent),
  notificationsSuppressed: Metric.counter(METRIC.notificationsSuppressed),
  rateLimitDeferred: Metric.counter(METRIC.rateLimitDeferred),
  schedulerLastFireAge: Metric.gauge(METRIC.schedulerLastFireAge),
  httpRequests: Metric.counter(METRIC.httpRequests),
  httpDuration: Metric.histogram(
    METRIC.httpDuration,
    MetricBoundaries.exponential({ start: 0.005, factor: 2, count: 12 }),
  ),
} as const
