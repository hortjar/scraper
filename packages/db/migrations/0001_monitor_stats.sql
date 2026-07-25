CREATE MATERIALIZED VIEW "monitor_stats" AS
SELECT
  m."id" AS monitor_id,
  m."user_id",
  count(r."id") FILTER (WHERE r."started_at" > now() - interval '24 hours') AS runs_24h,
  count(r."id") FILTER (WHERE r."started_at" > now() - interval '7 days') AS runs_7d,
  count(r."id") FILTER (WHERE r."started_at" > now() - interval '30 days') AS runs_30d,
  count(r."id") FILTER (WHERE r."status" = 'success' AND r."started_at" > now() - interval '7 days') AS successes_7d,
  count(r."id") FILTER (WHERE r."status" = 'failed' AND r."started_at" > now() - interval '7 days') AS failures_7d,
  count(r."id") FILTER (WHERE r."changed" AND r."started_at" > now() - interval '24 hours') AS changes_24h,
  count(r."id") FILTER (WHERE r."changed" AND r."started_at" > now() - interval '7 days') AS changes_7d,
  count(r."id") FILTER (WHERE r."changed" AND r."started_at" > now() - interval '30 days') AS changes_30d,
  avg(r."duration_ms") FILTER (WHERE r."status" = 'success' AND r."started_at" > now() - interval '7 days') AS avg_duration_ms_7d,
  max(r."started_at") AS last_run_at,
  max(r."started_at") FILTER (WHERE r."changed") AS last_change_at
FROM "monitors" m
LEFT JOIN "runs" r ON r."monitor_id" = m."id"
WHERE m."archived_at" IS NULL
GROUP BY m."id", m."user_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "monitor_stats_monitor_id_key" ON "monitor_stats" ("monitor_id");
--> statement-breakpoint
CREATE INDEX "monitor_stats_user_idx" ON "monitor_stats" ("user_id");
