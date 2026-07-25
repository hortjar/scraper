CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."actor_kind" AS ENUM('user', 'system', 'api_key');--> statement-breakpoint
CREATE TYPE "public"."change_kind" AS ENUM('appeared', 'disappeared', 'modified', 'increased', 'decreased');--> statement-breakpoint
CREATE TYPE "public"."delivery_mode" AS ENUM('immediate', 'digest');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."engine" AS ENUM('http', 'browser', 'auto');--> statement-breakpoint
CREATE TYPE "public"."monitor_status" AS ENUM('ok', 'degraded', 'failing', 'paused');--> statement-breakpoint
CREATE TYPE "public"."occurrence" AS ENUM('first', 'last', 'all', 'nth');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('running', 'success', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."run_trigger" AS ENUM('schedule', 'manual', 'retry', 'test');--> statement-breakpoint
CREATE TYPE "public"."schedule_kind" AS ENUM('interval', 'cron');--> statement-breakpoint
CREATE TYPE "public"."selector_kind" AS ENUM('css', 'xpath', 'jsonpath', 'regex', 'json_ld', 'whole_page');--> statement-breakpoint
CREATE TYPE "public"."strategy" AS ENUM('http', 'browser');--> statement-breakpoint
CREATE TYPE "public"."suppression_reason" AS ENUM('throttled', 'quiet_hours', 'duplicate', 'channel_disabled', 'channel_unverified', 'below_threshold', 'digest_pending');--> statement-breakpoint
CREATE TYPE "public"."token_purpose" AS ENUM('email_verify', 'password_reset', 'channel_verify');--> statement-breakpoint
CREATE TYPE "public"."trigger_kind" AS ENUM('any_change', 'field_changed', 'numeric_threshold', 'percent_change', 'text_contains', 'text_not_contains', 'regex_match', 'availability', 'run_failed', 'run_recovered', 'no_change_for');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."value_type" AS ENUM('text', 'number', 'price', 'boolean', 'url', 'date', 'list');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"actor_kind" "actor_kind" NOT NULL,
	"action" text NOT NULL,
	"subject_kind" text,
	"subject_id" uuid,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" "bytea" NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_expiry_after_creation" CHECK ("sessions"."expires_at" > "sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"plan_limits" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "token_purpose" NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitor_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"selector_kind" "selector_kind" NOT NULL,
	"selector" text NOT NULL,
	"attribute" text,
	"value_type" "value_type" NOT NULL,
	"transforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurrence" "occurrence" DEFAULT 'first' NOT NULL,
	"occurrence_index" integer,
	"required" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extractors_nth_requires_index" CHECK ("extractors"."occurrence" <> 'nth' OR "extractors"."occurrence_index" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "monitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"engine" "engine" DEFAULT 'auto' NOT NULL,
	"engine_resolved" "strategy",
	"engine_resolved_at" timestamp with time zone,
	"request" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"browser_options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schedule_kind" "schedule_kind" NOT NULL,
	"schedule_value" text NOT NULL,
	"schedule_timezone" text DEFAULT 'UTC' NOT NULL,
	"jitter_seconds" integer DEFAULT 30 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"status" "monitor_status" DEFAULT 'ok' NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"content_selector" text,
	"ignore_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"respect_robots" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"last_change_at" timestamp with time zone,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitors_jitter_non_negative" CHECK ("monitors"."jitter_seconds" >= 0),
	CONSTRAINT "monitors_consecutive_failures_non_negative" CHECK ("monitors"."consecutive_failures" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secret" "bytea",
	"secret_iv" "bytea",
	"secret_tag" "bytea",
	"verified_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_channels_secret_complete" CHECK (("notification_channels"."secret" IS NULL) = ("notification_channels"."secret_iv" IS NULL) AND ("notification_channels"."secret" IS NULL) = ("notification_channels"."secret_tag" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"monitor_id" uuid NOT NULL,
	"change_ids" uuid[] DEFAULT '{}' NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"suppressed_reason" "suppression_reason",
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_message_id" text,
	"payload_preview" jsonb,
	"message_hash" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_suppressed_has_reason" CHECK ("notification_deliveries"."status" <> 'suppressed' OR "notification_deliveries"."suppressed_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitor_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trigger_kind" "trigger_kind" NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"extractor_key" text,
	"delivery_mode" "delivery_mode" DEFAULT 'immediate' NOT NULL,
	"digest_cron" text,
	"throttle_seconds" integer DEFAULT 0 NOT NULL,
	"quiet_hours" jsonb,
	"template" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_fired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_rules_throttle_non_negative" CHECK ("notification_rules"."throttle_seconds" >= 0),
	CONSTRAINT "notification_rules_digest_requires_cron" CHECK ("notification_rules"."delivery_mode" <> 'digest' OR "notification_rules"."digest_cron" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitor_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"previous_run_id" uuid,
	"extractor_key" text,
	"change_kind" "change_kind" NOT NULL,
	"old_value" text,
	"new_value" text,
	"old_number" numeric,
	"new_number" numeric,
	"delta_absolute" numeric,
	"delta_percent" numeric,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"monitor_id" uuid NOT NULL,
	"extractor_key" text NOT NULL,
	"raw" text,
	"value_text" text,
	"value_number" numeric,
	"value_bool" boolean,
	"value_list" jsonb,
	"missing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitor_id" uuid NOT NULL,
	"trigger" "run_trigger" NOT NULL,
	"status" "run_status" NOT NULL,
	"strategy_used" "strategy",
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"http_status" integer,
	"bytes" integer,
	"content_hash" "bytea",
	"changed" boolean DEFAULT false NOT NULL,
	"error_kind" text,
	"error_message" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runs_attempt_positive" CHECK ("runs"."attempt" >= 1)
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"monitor_id" uuid NOT NULL,
	"content" text NOT NULL,
	"raw_ref" text,
	"screenshot_ref" text,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractors" ADD CONSTRAINT "extractors_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_rule_id_notification_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."notification_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_user_created_idx" ON "audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject_kind","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_user_name_key" ON "api_keys" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_active_idx" ON "sessions" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_hash_key" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_purpose_idx" ON "verification_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "verification_tokens_expires_idx" ON "verification_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "extractors_monitor_key_key" ON "extractors" USING btree ("monitor_id","key");--> statement-breakpoint
CREATE INDEX "extractors_monitor_position_idx" ON "extractors" USING btree ("monitor_id","position");--> statement-breakpoint
CREATE INDEX "monitors_user_active_idx" ON "monitors" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "monitors_due_idx" ON "monitors" USING btree ("enabled","next_run_at");--> statement-breakpoint
CREATE INDEX "monitors_tags_idx" ON "monitors" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_channels_user_name_key" ON "notification_channels" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "notification_channels_user_kind_idx" ON "notification_channels" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "notification_deliveries_rule_idx" ON "notification_deliveries" USING btree ("rule_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_deliveries_pending_idx" ON "notification_deliveries" USING btree ("status") WHERE "notification_deliveries"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "notification_rules_monitor_idx" ON "notification_rules" USING btree ("monitor_id","enabled");--> statement-breakpoint
CREATE INDEX "notification_rules_channel_idx" ON "notification_rules" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "changes_monitor_created_idx" ON "changes" USING btree ("monitor_id","created_at");--> statement-breakpoint
CREATE INDEX "changes_run_idx" ON "changes" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "field_values_series_idx" ON "field_values" USING btree ("monitor_id","extractor_key","run_id");--> statement-breakpoint
CREATE INDEX "field_values_run_idx" ON "field_values" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "runs_monitor_started_idx" ON "runs" USING btree ("monitor_id","started_at");--> statement-breakpoint
CREATE INDEX "runs_changed_idx" ON "runs" USING btree ("monitor_id") WHERE "runs"."changed";--> statement-breakpoint
CREATE INDEX "runs_job_idx" ON "runs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "snapshots_run_idx" ON "snapshots" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "snapshots_monitor_created_idx" ON "snapshots" USING btree ("monitor_id","created_at");