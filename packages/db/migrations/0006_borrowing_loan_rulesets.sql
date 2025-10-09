-- Migration 0006: loan_rulesets and rule entries for borrowing adaptation
CREATE TABLE "loan_rulesets" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "loan_rules" (
    "id" serial PRIMARY KEY NOT NULL,
    "ruleset_id" integer NOT NULL,
    "priority" integer DEFAULT 100,
    "pattern" text NOT NULL,
    "replacement" text NOT NULL,
    "notes" text
);
--> statement-breakpoint
ALTER TABLE "loan_rules" ADD CONSTRAINT "loan_rules_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "public"."loan_rulesets"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "idx_loan_rules_ruleset" ON loan_rules(ruleset_id);
