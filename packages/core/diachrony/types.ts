import { type InferSelectModel } from "drizzle-orm"

import { lexicalChangeLogs, semanticShiftLogs } from "../../db/schema/core"

export type LexicalChangeLogRecord = InferSelectModel<typeof lexicalChangeLogs>
export type SemanticShiftLogRecord = InferSelectModel<typeof semanticShiftLogs>

export type DiachronyTimelineEntry =
  | { kind: "lexical-change"; record: LexicalChangeLogRecord }
  | { kind: "semantic-shift"; record: SemanticShiftLogRecord }
