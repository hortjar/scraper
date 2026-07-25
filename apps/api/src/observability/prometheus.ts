import { Effect, Metric, type MetricPair, MetricState, Option } from "effect"

const LINE_BREAK = "\n"

const escapeLabelValue = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")

const renderLabels = (tags: MetricPair.MetricPair.Untyped["metricKey"]["tags"]): string => {
  if (tags.length === 0) return ""
  const parts = tags.map((tag) => `${tag.key}="${escapeLabelValue(tag.value)}"`)
  return `{${parts.join(",")}}`
}

const withExtraLabel = (labels: string, extra: string): string =>
  labels.length === 0 ? `{${extra}}` : `${labels.slice(0, -1)},${extra}}`

const renderSample = (name: string, labels: string, value: number | bigint): string =>
  `${name}${labels} ${typeof value === "bigint" ? value.toString() : value}${LINE_BREAK}`

const renderCounter = (
  name: string,
  labels: string,
  state: MetricState.MetricState.Counter<number | bigint>,
): string => `# TYPE ${name} counter${LINE_BREAK}${renderSample(name, labels, state.count)}`

const renderGauge = (
  name: string,
  labels: string,
  state: MetricState.MetricState.Gauge<number | bigint>,
): string => `# TYPE ${name} gauge${LINE_BREAK}${renderSample(name, labels, state.value)}`

const renderHistogram = (
  name: string,
  labels: string,
  state: MetricState.MetricState.Histogram,
): string => {
  const buckets = state.buckets
    .map(([boundary, count]) =>
      renderSample(`${name}_bucket`, withExtraLabel(labels, `le="${boundary}"`), count),
    )
    .join("")
  return (
    `# TYPE ${name} histogram${LINE_BREAK}${buckets}` +
    renderSample(`${name}_sum`, labels, state.sum) +
    renderSample(`${name}_count`, labels, state.count)
  )
}

const renderSummary = (
  name: string,
  labels: string,
  state: MetricState.MetricState.Summary,
): string => {
  const quantiles = state.quantiles
    .filter((entry): entry is [number, Option.Option<number>] => Option.isSome(entry[1]))
    .map(([quantile, value]) =>
      renderSample(
        name,
        withExtraLabel(labels, `quantile="${quantile}"`),
        Option.getOrThrow(value),
      ),
    )
    .join("")
  return (
    `# TYPE ${name} summary${LINE_BREAK}${quantiles}` +
    renderSample(`${name}_sum`, labels, state.sum) +
    renderSample(`${name}_count`, labels, state.count)
  )
}

const renderFrequency = (
  name: string,
  labels: string,
  state: MetricState.MetricState.Frequency,
): string => {
  const occurrences = Array.from(state.occurrences.entries())
    .map(([bucket, count]) =>
      renderSample(name, withExtraLabel(labels, `bucket="${escapeLabelValue(bucket)}"`), count),
    )
    .join("")
  return `# TYPE ${name} counter${LINE_BREAK}${occurrences}`
}

const renderPair = (pair: MetricPair.MetricPair.Untyped): string => {
  const name = pair.metricKey.name
  const labels = renderLabels(pair.metricKey.tags)
  const state = pair.metricState

  if (MetricState.isCounterState(state)) return renderCounter(name, labels, state)
  if (MetricState.isGaugeState(state)) return renderGauge(name, labels, state)
  if (MetricState.isHistogramState(state)) return renderHistogram(name, labels, state)
  if (MetricState.isSummaryState(state)) return renderSummary(name, labels, state)
  if (MetricState.isFrequencyState(state)) return renderFrequency(name, labels, state)
  return ""
}

export const renderPrometheusText: Effect.Effect<string> = Metric.snapshot.pipe(
  Effect.map((pairs) => pairs.map(renderPair).join("")),
)
