-- Migration 0008: code_switch_profiles to represent sociolinguistic code-switch patterns
CREATE TABLE "code_switch_profiles" (
    "id" serial PRIMARY KEY NOT NULL,
    "language_id" integer NOT NULL,
    "name" text NOT NULL,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_code_switch_language" ON "code_switch_profiles"("language_id");
