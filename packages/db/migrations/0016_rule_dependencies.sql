-- Migration: 0016_rule_dependencies
-- Description: Add rule_dependencies table for tracking dependencies between rules
-- Date: 2025-10-10

CREATE TABLE IF NOT EXISTS "rule_dependencies" (
    "id" serial PRIMARY KEY,
    "language_id" integer NOT NULL,
    "rule_type" text NOT NULL,
    "rule_id" integer NOT NULL,
    "depends_on_type" text NOT NULL,
    "depends_on_id" integer NOT NULL,
    "relation_type" text NOT NULL,
    "explanation" text,
    "weight" integer DEFAULT 1,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Ensure uniqueness: a rule can only have one dependency edge to another specific rule
CREATE UNIQUE INDEX IF NOT EXISTS "rule_dependencies_unique" ON "rule_dependencies" ("rule_type", "rule_id", "depends_on_type", "depends_on_id", "relation_type");

-- Index for efficient lookups by language
CREATE INDEX IF NOT EXISTS "rule_dependencies_language_idx" ON "rule_dependencies" ("language_id");

-- Index for finding dependencies of a specific rule
CREATE INDEX IF NOT EXISTS "rule_dependencies_rule_idx" ON "rule_dependencies" ("rule_type", "rule_id");

-- Index for finding what depends on a specific rule
CREATE INDEX IF NOT EXISTS "rule_dependencies_depends_on_idx" ON "rule_dependencies" ("depends_on_type", "depends_on_id");
