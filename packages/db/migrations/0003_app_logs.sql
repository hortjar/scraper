CREATE TYPE "log_level" AS ENUM('debug', 'info', 'warn', 'error', 'fatal');
--> statement-breakpoint
CREATE TABLE "app_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"level" "log_level" NOT NULL,
	"service" text NOT NULL,
	"message" text NOT NULL,
	"annotations" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "app_logs_at_idx" ON "app_logs" ("at");
--> statement-breakpoint
CREATE INDEX "app_logs_level_at_idx" ON "app_logs" ("level","at");
--> statement-breakpoint
CREATE INDEX "app_logs_service_at_idx" ON "app_logs" ("service","at");
