import { type InferSelectModel } from "drizzle-orm"

import { lexicalChangeLogs, semanticShiftLogs } from "../../db/schema/core"

export type LexicalChangeLogRecord = InferSelectModel<typeof lexicalChangeLogs>
export type SemanticShiftLogRecord = InferSelectModel<typeof semanticShiftLogs>

export type DiachronyTimelineEntry =
  | { kind: "lexical-change"; record: LexicalChangeLogRecord }
  | { kind: "semantic-shift"; record: SemanticShiftLogRecord }


// Evolution batch job types
export interface EvolutionRule {
  id: string
  type: "sound-change" | "lexical-replacement" | "semantic-shift" | "innovation"
  description: string
  enabled: boolean
  meta?: Record<string, unknown>
}

export interface EvolutionBatchInput {
  languageId: number
  rules: EvolutionRule[]
  targetLexemes?: number[] // If specified, only apply to these lexemes
  dryRun: boolean
  actor?: string
  seed?: number // For deterministic RNG
}

export interface EvolutionChange {
  lexemeId: number
  ruleId: string
  changeType: "lexical" | "semantic"
  before: string
  after: string
  confidence: number
}

export interface EvolutionBatchResult {
  jobId: string
  languageId: number
  dryRun: boolean
  changes: EvolutionChange[]
  stats: {
    rulesApplied: number
    lexemesAffected: number
    changesProposed: number
    changesApplied: number
  }
  warnings: string[]
  completedAt: Date
}

export interface ProvenanceTrace {
  changeId: number
  ruleId: string
  appliedAt: Date
  actor: string | null
  inputState: Record<string, unknown>
  outputState: Record<string, unknown>
  meta: Record<string, unknown>
}

// Semantic drift taxonomy
export const SEMANTIC_SHIFT_TYPES = [
  "generalization",
  "specialization",
  "metaphor",
  "metonymy",
  "amelioration",
  "pejoration",
  "taboo-replacement",
  "folk-etymology",
  "semantic-bleaching"
] as const

export type SemanticShiftType = typeof SEMANTIC_SHIFT_TYPES[number]

export interface SemanticDriftInput {
  languageId: number
  senseId: number
  shiftType: SemanticShiftType
  targetDomain?: string
  trigger?: {
    culturalContext?: string
    frequencyThreshold?: number
    cooccurrencePattern?: string
  }
  note?: string
  actor?: string
}

// Drift heatmap types
export interface DriftHeatmapEntry {
  semanticField: string
  period: string // e.g., "2025-Q1"
  shiftCount: number
  dominantShiftType: SemanticShiftType
  intensity: number // 0-1 normalized
}

export interface DriftHeatmapOptions {
  languageId: number
  startDate?: Date
  endDate?: Date
  groupBy: "month" | "quarter" | "year"
  semanticFields?: string[]
}
