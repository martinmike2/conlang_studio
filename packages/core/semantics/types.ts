import type { InferSelectModel } from "drizzle-orm"
import { semanticFrames, lexemeSenses, idioms, senseRelations } from "../../db/schema/core"

export type SemanticFrameRecord = InferSelectModel<typeof semanticFrames>
export type LexemeSenseRecord = InferSelectModel<typeof lexemeSenses>
export type IdiomRecord = InferSelectModel<typeof idioms>
export type SenseRelationRecord = InferSelectModel<typeof senseRelations>
