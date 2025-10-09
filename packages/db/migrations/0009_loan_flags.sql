-- Migration 0009: loan_flags for capturing proposed/accepted borrowings
CREATE TABLE "loan_flags" (
    "id" serial PRIMARY KEY NOT NULL,
    "contact_event_id" integer NOT NULL,
    "candidate_root_id" integer,
    "candidate_pattern_id" integer,
    "accepted" integer DEFAULT 0 NOT NULL,
    "reason" text,
    "meta" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_loan_flags_contact_event" ON loan_flags(contact_event_id);
ALTER TABLE "loan_flags" ADD CONSTRAINT "loan_flags_contact_event_fkey" FOREIGN KEY ("contact_event_id") REFERENCES "public"."contact_events"("id") ON DELETE cascade ON UPDATE no action;
