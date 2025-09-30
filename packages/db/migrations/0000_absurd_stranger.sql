CREATE TABLE "ablaut_schemes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classifier_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idioms" (
	"id" serial PRIMARY KEY NOT NULL,
	"frame_id" integer,
	"text" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "languages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lexeme_senses" (
	"id" serial PRIMARY KEY NOT NULL,
	"frame_id" integer NOT NULL,
	"gloss" text NOT NULL,
	"definition" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"skeleton" text NOT NULL,
	"slot_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reduplication_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"template" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "root_pattern_bindings" (
	"id" serial PRIMARY KEY NOT NULL,
	"root_id" integer NOT NULL,
	"pattern_id" integer NOT NULL,
	"generated_form" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roots" (
	"id" serial PRIMARY KEY NOT NULL,
	"representation" text NOT NULL,
	"gloss" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semantic_frames" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "semantic_frames_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sense_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_sense_id" integer NOT NULL,
	"target_sense_id" integer NOT NULL,
	"relation_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idioms" ADD CONSTRAINT "idioms_frame_id_semantic_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."semantic_frames"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexeme_senses" ADD CONSTRAINT "lexeme_senses_frame_id_semantic_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."semantic_frames"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "root_pattern_bindings" ADD CONSTRAINT "root_pattern_bindings_root_id_roots_id_fk" FOREIGN KEY ("root_id") REFERENCES "public"."roots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "root_pattern_bindings" ADD CONSTRAINT "root_pattern_bindings_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sense_relations" ADD CONSTRAINT "sense_relations_source_sense_id_lexeme_senses_id_fk" FOREIGN KEY ("source_sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sense_relations" ADD CONSTRAINT "sense_relations_target_sense_id_lexeme_senses_id_fk" FOREIGN KEY ("target_sense_id") REFERENCES "public"."lexeme_senses"("id") ON DELETE cascade ON UPDATE no action;