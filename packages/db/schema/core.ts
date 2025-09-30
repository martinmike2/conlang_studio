import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core"

export const languages = pgTable("languages", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

// Phase 1 Semantics
export const semanticFrames = pgTable("semantic_frames", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    domain: text("domain"),
    description: text("description"),
    roles: jsonb("roles").notNull().$type<Array<{ name: string; cardinality: string; order: number }>>(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const lexemeSenses = pgTable("lexeme_senses", {
    id: serial("id").primaryKey(),
    frameId: integer("frame_id").notNull().references(() => semanticFrames.id, { onDelete: 'cascade' }),
    gloss: text("gloss").notNull(),
    definition: text("definition"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const senseRelations = pgTable("sense_relations", {
    id: serial("id").primaryKey(),
    sourceSenseId: integer("source_sense_id").notNull().references(() => lexemeSenses.id, { onDelete: 'cascade' }),
    targetSenseId: integer("target_sense_id").notNull().references(() => lexemeSenses.id, { onDelete: 'cascade' }),
    relationType: text("relation_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const idioms = pgTable("idioms", {
    id: serial("id").primaryKey(),
    frameId: integer("frame_id").references(() => semanticFrames.id, { onDelete: 'set null' }),
    textValue: text("text").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const activityLog = pgTable("activity_log", {
    id: serial("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    scope: text("scope").notNull(),
    entity: text("entity"),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    actor: text("actor"),
    frameId: integer("frame_id").references(() => semanticFrames.id, { onDelete: 'set null' }),
    senseId: integer("sense_id").references(() => lexemeSenses.id, { onDelete: 'set null' }),
    idiomId: integer("idiom_id").references(() => idioms.id, { onDelete: 'set null' }),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>().default({})
})

export const classifierSystems = pgTable("classifier_systems", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

// Phase 1 Morphology
export const roots = pgTable("roots", {
    id: serial("id").primaryKey(),
    representation: text("representation").notNull(),
    gloss: text("gloss"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const patterns = pgTable("patterns", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    skeleton: text("skeleton").notNull(),
    slotCount: integer("slot_count").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const rootPatternBindings = pgTable("root_pattern_bindings", {
    id: serial("id").primaryKey(),
    rootId: integer("root_id").notNull().references(() => roots.id, { onDelete: 'cascade' }),
    patternId: integer("pattern_id").notNull().references(() => patterns.id, { onDelete: 'cascade' }),
    generatedForm: text("generated_form"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const reduplicationTemplates = pgTable("reduplication_templates", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    template: text("template").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const ablautSchemes = pgTable("ablaut_schemes", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})