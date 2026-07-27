import type {
  CreateMonitorData,
  GetMonitorResponse,
  ListMonitorsResponse,
  UpdateMonitorData,
} from "../../api"

export type MonitorCreateBody = CreateMonitorData["body"]
export type MonitorUpdateBody = UpdateMonitorData["body"]
export type MonitorDetail = GetMonitorResponse
export type MonitorListPage = ListMonitorsResponse
export type MonitorListItem = MonitorListPage["items"][number]
export type MonitorExtractor = MonitorDetail["extractors"][number]

export type ExtractorInput = NonNullable<MonitorCreateBody["extractors"]>[number]
export type TransformInput = NonNullable<ExtractorInput["transforms"]>[number]
export type IgnoreRuleInput = NonNullable<MonitorCreateBody["ignoreRules"]>[number]
export type ScheduleInput = MonitorCreateBody["schedule"]

export type MonitorEngine = NonNullable<MonitorCreateBody["engine"]>
export type SelectorKind = ExtractorInput["selectorKind"]
export type ValueType = ExtractorInput["valueType"]
export type Occurrence = NonNullable<ExtractorInput["occurrence"]>
export type TransformKind = TransformInput["kind"]
export type IgnoreRuleKind = IgnoreRuleInput["kind"]
export type ScheduleKind = ScheduleInput["kind"]
