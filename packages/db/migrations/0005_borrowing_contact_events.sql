-- Migration 0005: contact_events table for borrowing intake
CREATE TABLE "contact_events" (
    "id" serial PRIMARY KEY NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "donor_language" text NOT NULL,
    "recipient_language" text NOT NULL,
    "source_text" text NOT NULL,
    "normalized_form" text,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX "idx_contact_events_donor_recipient" ON contact_events(donor_language, recipient_language);
