-- Migration 0010: variant_overlays to persist overlay definitions and ops
CREATE TABLE "variant_overlays" (
  "id" serial PRIMARY KEY NOT NULL,
  "language_id" integer,
  "name" text NOT NULL,
  "ops" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "meta" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
-- index
CREATE INDEX "idx_variant_overlays_language" ON variant_overlays(language_id);
