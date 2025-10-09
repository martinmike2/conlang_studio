-- Migration 0014: Diachrony logging tables for lexical and semantic shifts
CREATE TABLE "lexical_change_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "language_id" integer NOT NULL,
    "lexeme_id" integer,
    "change_type" text NOT NULL,
    "note" text,
    "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "lexical_change_logs"
    ADD CONSTRAINT "lexical_change_logs_language_id_languages_id_fk"
    FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "idx_lexical_change_logs_language_created_at"
    ON "lexical_change_logs" ("language_id", "created_at");

CREATE TABLE "semantic_shift_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "language_id" integer NOT NULL,
    "sense_id" integer,
    "shift_type" text NOT NULL,
    "note" text,
    "trigger" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "semantic_shift_logs"
    ADD CONSTRAINT "semantic_shift_logs_language_id_languages_id_fk"
    FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "semantic_shift_logs"
    ADD CONSTRAINT "semantic_shift_logs_sense_id_lexeme_senses_id_fk"
    FOREIGN KEY ("sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "idx_semantic_shift_logs_language_created_at"
    ON "semantic_shift_logs" ("language_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_semantic_shift_logs_sense_id"
    ON "semantic_shift_logs" ("sense_id");
