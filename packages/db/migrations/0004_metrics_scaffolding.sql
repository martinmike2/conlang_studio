CREATE TABLE "usage_stats" (
    "id" serial PRIMARY KEY NOT NULL,
    "language_id" integer NOT NULL,
    "target_kind" text NOT NULL,
    "target_id" integer,
    "freq" integer NOT NULL DEFAULT 0,
    "window_start" timestamp,
    "window_end" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complexity_snapshots" (
    "id" serial PRIMARY KEY NOT NULL,
    "language_id" integer NOT NULL,
    "version_ref" text,
    "metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics_jobs" (
    "id" serial PRIMARY KEY NOT NULL,
    "language_id" integer NOT NULL,
    "status" text NOT NULL,
    "started_at" timestamp,
    "finished_at" timestamp,
    "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
