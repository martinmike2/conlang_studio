CREATE TABLE "tone_targets" (
    "id" serial PRIMARY KEY NOT NULL,
    "lexeme_id" integer,
    "slot_index" integer NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tone_associations" (
    "id" serial PRIMARY KEY NOT NULL,
    "target_id" integer NOT NULL,
    "tone" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "tone_associations_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."tone_targets"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "orthographies" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "grapheme_map" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orthography_samples" (
    "id" serial PRIMARY KEY NOT NULL,
    "orthography_id" integer NOT NULL,
    "surface" text NOT NULL,
    "transliteration" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "orthography_samples_orthography_id_fkey" FOREIGN KEY ("orthography_id") REFERENCES "public"."orthographies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "pattern_sets" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pattern_set_members" (
    "pattern_set_id" integer NOT NULL,
    "pattern_id" integer NOT NULL,
    CONSTRAINT "pattern_set_members_pattern_set_id_fkey" FOREIGN KEY ("pattern_set_id") REFERENCES "public"."pattern_sets"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "pattern_set_members_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "pattern_set_members_pk" PRIMARY KEY ("pattern_set_id", "pattern_id")
);
--> statement-breakpoint
CREATE TABLE "root_pattern_requirements" (
    "root_id" integer NOT NULL,
    "pattern_set_id" integer NOT NULL,
    CONSTRAINT "root_pattern_requirements_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "public"."roots"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "root_pattern_requirements_pattern_set_id_fkey" FOREIGN KEY ("pattern_set_id") REFERENCES "public"."pattern_sets"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "root_pattern_requirements_pk" PRIMARY KEY ("root_id", "pattern_set_id")
);
