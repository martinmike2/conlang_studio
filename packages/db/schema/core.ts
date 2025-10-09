import { pgTable, serial, text, timestamp, integer, jsonb, uniqueIndex, primaryKey } from "drizzle-orm/pg-core"

export const languages = pgTable("languages", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const users = pgTable("users", {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    hashedPassword: text("hashed_password"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const accounts = pgTable("accounts", {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
}, table => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId], name: "accounts_provider_provider_account_id_pk" })
}))

export const sessions = pgTable("sessions", {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp("expires", { withTimezone: true }).notNull()
})

export const verificationTokens = pgTable("verification_tokens", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull()
}, table => ({
    pk: primaryKey({ columns: [table.identifier, table.token], name: "verification_tokens_identifier_token_pk" })
}))

export const userLanguages = pgTable("user_languages", {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    languageId: integer("language_id").notNull().references(() => languages.id, { onDelete: 'cascade' }),
    role: text("role").notNull().default('owner')
}, table => ({
    pk: primaryKey({ columns: [table.userId, table.languageId], name: "user_languages_pk" })
}))

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

export const lexicalChangeLogs = pgTable("lexical_change_logs", {
    id: serial("id").primaryKey(),
    languageId: integer("language_id").notNull().references(() => languages.id, { onDelete: 'cascade' }),
    lexemeId: integer("lexeme_id"),
    changeType: text("change_type").notNull(),
    note: text("note"),
    meta: jsonb("meta").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})

export const semanticShiftLogs = pgTable("semantic_shift_logs", {
    id: serial("id").primaryKey(),
    languageId: integer("language_id").notNull().references(() => languages.id, { onDelete: 'cascade' }),
    senseId: integer("sense_id").references(() => lexemeSenses.id, { onDelete: 'set null' }),
    shiftType: text("shift_type").notNull(),
    note: text("note"),
    trigger: jsonb("trigger").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
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

export const toneTargets = pgTable("tone_targets", {
    id: serial("id").primaryKey(),
    lexemeId: integer("lexeme_id"),
    slotIndex: integer("slot_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const toneAssociations = pgTable("tone_associations", {
    id: serial("id").primaryKey(),
    targetId: integer("target_id").notNull().references(() => toneTargets.id, { onDelete: 'cascade' }),
    tone: text("tone").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const orthographies = pgTable("orthographies", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    graphemeMap: jsonb("grapheme_map").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const orthographySamples = pgTable("orthography_samples", {
    id: serial("id").primaryKey(),
    orthographyId: integer("orthography_id").notNull().references(() => orthographies.id, { onDelete: 'cascade' }),
    surface: text("surface").notNull(),
    transliteration: text("transliteration").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const patternSets = pgTable("pattern_sets", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const patternSetMembers = pgTable("pattern_set_members", {
    patternSetId: integer("pattern_set_id").notNull().references(() => patternSets.id, { onDelete: 'cascade' }),
    patternId: integer("pattern_id").notNull().references(() => patterns.id, { onDelete: 'cascade' })
}, (table) => ({
    pk: { columns: [table.patternSetId, table.patternId], name: "pattern_set_members_pk" }
}))

export const rootPatternRequirements = pgTable("root_pattern_requirements", {
    rootId: integer("root_id").notNull().references(() => roots.id, { onDelete: 'cascade' }),
    patternSetId: integer("pattern_set_id").notNull().references(() => patternSets.id, { onDelete: 'cascade' })
}, (table) => ({
    pk: { columns: [table.rootId, table.patternSetId], name: "root_pattern_requirements_pk" }
}))

// Phase 2 Metrics scaffolding (early)
export const usageStats = pgTable("usage_stats", {
    id: serial("id").primaryKey(),
    languageId: integer("language_id").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: integer("target_id"),
    freq: integer("freq").notNull().default(0),
    windowStart: timestamp("window_start"),
    windowEnd: timestamp("window_end"),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const complexitySnapshots = pgTable("complexity_snapshots", {
    id: serial("id").primaryKey(),
    languageId: integer("language_id").notNull(),
    versionRef: text("version_ref"),
    metrics: jsonb("metrics").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const metricsJobs = pgTable("metrics_jobs", {
    id: serial("id").primaryKey(),
    languageId: integer("language_id").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

// Phase 2: Borrowing / Contact events
export const contactEvents = pgTable("contact_events", {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    donorLanguage: text("donor_language").notNull(),
    recipientLanguage: text("recipient_language").notNull(),
    sourceText: text("source_text").notNull(),
    normalizedForm: text("normalized_form"),
    metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({})
})

export const loanRulesets = pgTable("loan_rulesets", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    active: integer("active").default(1)
})

export const loanRules = pgTable("loan_rules", {
    id: serial("id").primaryKey(),
    rulesetId: integer("ruleset_id").notNull().references(() => loanRulesets.id, { onDelete: 'cascade' }),
    priority: integer("priority").default(100),
    pattern: text("pattern").notNull(),
    replacement: text("replacement").notNull(),
    notes: text("notes")
})

export const loanFlags = pgTable("loan_flags", {
    id: serial("id").primaryKey(),
    contactEventId: integer("contact_event_id").notNull().references(() => contactEvents.id, { onDelete: 'cascade' }),
    candidateRootId: integer("candidate_root_id").$type<number | null>(),
    candidatePatternId: integer("candidate_pattern_id").$type<number | null>(),
    accepted: integer("accepted").default(0).$type<number>(),
    reason: text("reason"),
    meta: jsonb("meta").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

export const stylePolicies = pgTable("style_policies", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    languageId: integer("language_id"),
    rules: jsonb("rules").notNull().$type<Array<Record<string, unknown>>>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
    languageIndex: uniqueIndex("style_policies_language_name_unique").on(table.languageId, table.name)
}))

export const variantOverlays = pgTable("variant_overlays", {
    id: serial("id").primaryKey(),
    languageId: integer("language_id"),
    name: text("name").notNull(),
    ops: jsonb("ops").notNull().$type<Array<Record<string, unknown>>>().default([]),
    meta: jsonb("meta").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
    languageNameUnique: uniqueIndex("variant_overlays_language_name_unique").on(table.languageId, table.name)
}))