import type { InferSelectModel } from "drizzle-orm"
import {
	roots,
	patterns,
	rootPatternBindings,
	reduplicationTemplates,
	ablautSchemes,
	patternSets,
	patternSetMembers,
	rootPatternRequirements
} from "../../db/schema/core"

export type RootRecord = InferSelectModel<typeof roots>
export type PatternRecord = InferSelectModel<typeof patterns>
export type RootPatternBindingRecord = InferSelectModel<typeof rootPatternBindings>
export type ReduplicationTemplateRecord = InferSelectModel<typeof reduplicationTemplates>
export type AblautSchemeRecord = InferSelectModel<typeof ablautSchemes>
export type PatternSetRecord = InferSelectModel<typeof patternSets>
export type PatternSetMemberRecord = InferSelectModel<typeof patternSetMembers>
export type RootPatternRequirementRecord = InferSelectModel<typeof rootPatternRequirements>
