-- Migration 0007: style_policies for register & style evaluation
CREATE TABLE "style_policies" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "language_id" integer,
    "rules" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_style_policies_language" ON "style_policies"("language_id");
