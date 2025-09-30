import type { InferSelectModel } from "drizzle-orm"
import { roots, patterns, rootPatternBindings, reduplicationTemplates, ablautSchemes } from "../../db/schema/core"

export type RootRecord = InferSelectModel<typeof roots>
export type PatternRecord = InferSelectModel<typeof patterns>
export type RootPatternBindingRecord = InferSelectModel<typeof rootPatternBindings>
export type ReduplicationTemplateRecord = InferSelectModel<typeof reduplicationTemplates>
export type AblautSchemeRecord = InferSelectModel<typeof ablautSchemes>
