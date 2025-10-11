import { and, desc, eq, gte, lt, lte, type SQL } from "drizzle-orm"
import type { InferInsertModel } from "drizzle-orm"
import { getDb } from "../../db/client"
import { lexicalChangeLogs, semanticShiftLogs } from "../../db/schema/core"
import { recordActivity } from "@core/activity"
import type { 
  DiachronyTimelineEntry, 
  LexicalChangeLogRecord, 
  SemanticShiftLogRecord,
  EvolutionBatchInput,
  EvolutionBatchResult,
  EvolutionChange,
  ProvenanceTrace,
  SemanticDriftInput,
  SemanticShiftType,
  DriftHeatmapOptions,
  DriftHeatmapEntry
} from "./types"
import { SEMANTIC_SHIFT_TYPES } from "./types"

type DbClient = ReturnType<typeof getDb>

type LexicalChangeInsert = InferInsertModel<typeof lexicalChangeLogs>
type SemanticShiftInsert = InferInsertModel<typeof semanticShiftLogs>

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export interface RecordLexicalChangeInput {
  languageId: number
  changeType: string
  note?: string | null
  lexemeId?: number | null
  actor?: string | null
  meta?: Record<string, unknown>
  occurredAt?: Date
}

export interface RecordSemanticShiftInput {
  languageId: number
  shiftType: string
  note?: string | null
  senseId?: number | null
  actor?: string | null
  trigger?: Record<string, unknown>
  occurredAt?: Date
}

export interface DiachronyListOptions {
  languageId: number
  limit?: number
  beforeId?: number
  before?: Date
  since?: Date
}

export interface DiachronyTimelineOptions {
  languageId: number
  limit?: number
  before?: Date
  since?: Date
}

export interface DiachronyService {
  recordLexicalChange(input: RecordLexicalChangeInput): Promise<LexicalChangeLogRecord>
  listLexicalChanges(options: DiachronyListOptions): Promise<LexicalChangeLogRecord[]>
  recordSemanticShift(input: RecordSemanticShiftInput): Promise<SemanticShiftLogRecord>
  listSemanticShifts(options: DiachronyListOptions): Promise<SemanticShiftLogRecord[]>
  getTimeline(options: DiachronyTimelineOptions): Promise<DiachronyTimelineEntry[]>
  
  // Phase 3: Evolution batch job
  executeEvolutionBatch(input: EvolutionBatchInput): Promise<EvolutionBatchResult>
  
  // Phase 3: Provenance traces
  recordProvenanceTrace(trace: Omit<ProvenanceTrace, "changeId">): Promise<ProvenanceTrace>
  
  // Phase 3: Semantic drift with taxonomy
  recordSemanticDrift(input: SemanticDriftInput): Promise<SemanticShiftLogRecord>
  
  // Phase 3: Drift heatmap
  getDriftHeatmap(options: DriftHeatmapOptions): Promise<DriftHeatmapEntry[]>
}

function clampLimit(limit?: number): number {
  if (!limit) return DEFAULT_LIMIT
  return Math.min(Math.max(limit, 1), MAX_LIMIT)
}

function toPlainJson(value?: Record<string, unknown> | null): Record<string, unknown> {
  if (!value) return {}
  return JSON.parse(JSON.stringify(value))
}

// Seeded RNG for deterministic evolution
function createSeededRNG(seed: number) {
  let state = seed
  return {
    next(): number {
      state = (state * 1664525 + 1013904223) % 2**32
      return state / 2**32
    },
    nextInt(max: number): number {
      return Math.floor(this.next() * max)
    }
  }
}

// Fetch all lexeme IDs for a language
async function fetchAllLexemeIds(db: DbClient, languageId: number): Promise<number[]> {
  // TODO: When lexemes table is added to schema, implement this properly
  // For now, return empty array - evolution batch will warn about no lexemes
  return []
}

// Fetch a single lexeme
async function fetchLexeme(db: DbClient, lexemeId: number): Promise<any> {
  // TODO: When lexemes table is added to schema, implement this properly
  // For now, return a mock lexeme for testing
  return {
    id: lexemeId,
    lemma: `lexeme-${lexemeId}`,
    gloss: "placeholder",
    pos: "noun"
  }
}

// Apply an evolution rule to a lexeme
async function applyEvolutionRule(
  rule: { id: string; type: string; description: string; meta?: Record<string, unknown> },
  lexeme: any,
  rng: ReturnType<typeof createSeededRNG>
): Promise<{ type: "lexical" | "semantic"; before: string; after: string; confidence: number } | null> {
  // Simplified rule application - in production this would be much more sophisticated
  const confidence = 0.5 + rng.next() * 0.5 // Random confidence between 0.5 and 1.0
  
  if (rule.type === "sound-change" && lexeme.lemma) {
    // Simple vowel shift example
    const before = lexeme.lemma
    const after = before.replace(/a/g, "ɑ").replace(/i/g, "ɪ")
    if (before !== after) {
      return { type: "lexical", before, after, confidence }
    }
  } else if (rule.type === "lexical-replacement" && lexeme.lemma) {
    // Example: mark as archaic/replaced
    return {
      type: "lexical",
      before: lexeme.lemma,
      after: `${lexeme.lemma}†`,
      confidence
    }
  } else if (rule.type === "semantic-shift") {
    // Semantic shift
    return {
      type: "semantic",
      before: lexeme.gloss ?? "unknown",
      after: `${lexeme.gloss ?? "unknown"} (shifted)`,
      confidence
    }
  } else if (rule.type === "innovation") {
    // Innovation/neologism
    return {
      type: "lexical",
      before: lexeme.lemma ?? "",
      after: `${lexeme.lemma ?? ""}+innov`,
      confidence
    }
  }
  
  return null
}

// Extract semantic field from a shift log
function extractSemanticField(shift: SemanticShiftLogRecord): string | null {
  if (shift.trigger && typeof shift.trigger === "object") {
    const trigger = shift.trigger as Record<string, unknown>
    if (trigger.semanticField && typeof trigger.semanticField === "string") {
      return trigger.semanticField
    }
    if (trigger.targetDomain && typeof trigger.targetDomain === "string") {
      return trigger.targetDomain
    }
  }
  return null
}

// Format date according to groupBy parameter
function formatPeriod(date: Date | null, groupBy: "month" | "quarter" | "year"): string {
  if (!date) return "unknown"
  
  const d = new Date(date)
  const year = d.getFullYear()
  
  if (groupBy === "year") {
    return `${year}`
  } else if (groupBy === "quarter") {
    const quarter = Math.floor(d.getMonth() / 3) + 1
    return `${year}-Q${quarter}`
  } else {
    const month = String(d.getMonth() + 1).padStart(2, "0")
    return `${year}-${month}`
  }
}

function buildWhereClause<Table extends typeof lexicalChangeLogs | typeof semanticShiftLogs>(
  table: Table,
  options: DiachronyListOptions
) {
  const extras: SQL[] = []
  if (options.beforeId) {
    extras.push(lt(table.id, options.beforeId))
  }
  if (options.before) {
    extras.push(lt(table.createdAt, options.before))
  }
  if (options.since) {
    extras.push(gte(table.createdAt, options.since))
  }

  const base = eq(table.languageId, options.languageId)
  if (extras.length === 0) {
    return base
  }
  return and(base, ...extras)
}

function prepareLexicalInsert(input: RecordLexicalChangeInput): LexicalChangeInsert {
  const insert: LexicalChangeInsert = {
    languageId: input.languageId,
    lexemeId: input.lexemeId ?? null,
    changeType: input.changeType,
    note: input.note ?? null,
    meta: toPlainJson(input.meta)
  }

  if (input.occurredAt) {
    insert.createdAt = input.occurredAt
  }

  return insert
}

function prepareSemanticShiftInsert(input: RecordSemanticShiftInput): SemanticShiftInsert {
  const insert: SemanticShiftInsert = {
    languageId: input.languageId,
    senseId: input.senseId ?? null,
    shiftType: input.shiftType,
    note: input.note ?? null,
    trigger: toPlainJson(input.trigger)
  }

  if (input.occurredAt) {
    insert.createdAt = input.occurredAt
  }

  return insert
}

function summarizeLexicalChange(record: LexicalChangeLogRecord): string {
  const lexemeLabel = record.lexemeId ? `lexeme #${record.lexemeId}` : "lexeme"
  return `${lexemeLabel} ${record.changeType}`
}

function summarizeSemanticShift(record: SemanticShiftLogRecord): string {
  const senseLabel = record.senseId ? `sense #${record.senseId}` : "sense"
  return `${senseLabel} ${record.shiftType}`
}

export function createDiachronyService(db: DbClient = getDb()): DiachronyService {
  return {
    async recordLexicalChange(input) {
      const [created] = await db.insert(lexicalChangeLogs).values(prepareLexicalInsert(input)).returning()
      if (!created) {
        throw new Error("Failed to record lexical change")
      }

      await recordActivity({
        scope: "diachrony",
        entity: "lexical-change",
        action: input.changeType,
        summary: summarizeLexicalChange(created),
        actor: input.actor ?? null,
        payload: {
          languageId: created.languageId,
          lexemeId: created.lexemeId,
          note: created.note,
          meta: created.meta
        }
      }, db)

      return created
    },

    async listLexicalChanges(options) {
      const limit = clampLimit(options.limit)
      const where = buildWhereClause(lexicalChangeLogs, options)

      const rows = await db
        .select()
        .from(lexicalChangeLogs)
        .where(where)
        .orderBy(desc(lexicalChangeLogs.createdAt), desc(lexicalChangeLogs.id))
        .limit(limit)

      return rows
    },

    async recordSemanticShift(input) {
      const [created] = await db.insert(semanticShiftLogs).values(prepareSemanticShiftInsert(input)).returning()
      if (!created) {
        throw new Error("Failed to record semantic shift")
      }

      await recordActivity({
        scope: "diachrony",
        entity: "semantic-shift",
        action: input.shiftType,
        summary: summarizeSemanticShift(created),
        actor: input.actor ?? null,
        payload: {
          languageId: created.languageId,
          senseId: created.senseId,
          note: created.note,
          trigger: created.trigger
        }
      }, db)

      return created
    },

    async listSemanticShifts(options) {
      const limit = clampLimit(options.limit)
      const where = buildWhereClause(semanticShiftLogs, options)

      const rows = await db
        .select()
        .from(semanticShiftLogs)
        .where(where)
        .orderBy(desc(semanticShiftLogs.createdAt), desc(semanticShiftLogs.id))
        .limit(limit)

      return rows
    },

    async getTimeline(options) {
      const limit = clampLimit(options.limit)
      const perTableLimit = Math.min(limit * 2, MAX_LIMIT)

      const [lexical, semantic] = await Promise.all([
        this.listLexicalChanges({
          languageId: options.languageId,
          limit: perTableLimit,
          before: options.before,
          since: options.since
        }),
        this.listSemanticShifts({
          languageId: options.languageId,
          limit: perTableLimit,
          before: options.before,
          since: options.since
        })
      ])

      const combined: DiachronyTimelineEntry[] = [
        ...lexical.map(record => ({ kind: "lexical-change" as const, record })),
        ...semantic.map(record => ({ kind: "semantic-shift" as const, record }))
      ]

      combined.sort((a, b) => {
        const timeA = a.record.createdAt?.valueOf?.() ?? 0
        const timeB = b.record.createdAt?.valueOf?.() ?? 0
        if (timeA === timeB) {
          return (b.record as { id: number }).id - (a.record as { id: number }).id
        }
        return timeB - timeA
      })

      return combined.slice(0, limit)
    },

    async executeEvolutionBatch(input) {
      const jobId = `evolution-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const startTime = new Date()
      
      // Seeded random number generator for determinism
      const rng = createSeededRNG(input.seed ?? Date.now())
      
      const changes: EvolutionChange[] = []
      const warnings: string[] = []
      const affectedLexemes = new Set<number>()
      const enabledRules = input.rules.filter(r => r.enabled)
      
      // Fetch lexemes to process
      const lexemeIds = input.targetLexemes ?? await fetchAllLexemeIds(db, input.languageId)
      
      if (lexemeIds.length === 0) {
        warnings.push("No lexemes found to process")
      }
      
      // Apply each rule to each lexeme
      for (const rule of enabledRules) {
        for (const lexemeId of lexemeIds) {
          const lexeme = await fetchLexeme(db, lexemeId)
          if (!lexeme) continue
          
          const change = await applyEvolutionRule(rule, lexeme, rng)
          
          if (change) {
            changes.push({
              lexemeId,
              ruleId: rule.id,
              changeType: rule.type === "semantic-shift" ? "semantic" : "lexical",
              before: change.before,
              after: change.after,
              confidence: change.confidence
            })
            affectedLexemes.add(lexemeId)
            
            // If not dry run, persist the change
            if (!input.dryRun) {
              if (change.type === "lexical") {
                await this.recordLexicalChange({
                  languageId: input.languageId,
                  lexemeId,
                  changeType: rule.type,
                  note: `Evolution batch ${jobId}: ${rule.description}`,
                  actor: input.actor ?? null,
                  meta: {
                    jobId,
                    ruleId: rule.id,
                    before: change.before,
                    after: change.after,
                    confidence: change.confidence
                  }
                })
              } else if (change.type === "semantic" && lexeme.senseId) {
                await this.recordSemanticShift({
                  languageId: input.languageId,
                  senseId: lexeme.senseId,
                  shiftType: rule.type,
                  note: `Evolution batch ${jobId}: ${rule.description}`,
                  actor: input.actor ?? null,
                  trigger: {
                    jobId,
                    ruleId: rule.id,
                    before: change.before,
                    after: change.after
                  }
                })
              }
            }
          }
        }
      }
      
      const result: EvolutionBatchResult = {
        jobId,
        languageId: input.languageId,
        dryRun: input.dryRun,
        changes,
        stats: {
          rulesApplied: enabledRules.length,
          lexemesAffected: affectedLexemes.size,
          changesProposed: changes.length,
          changesApplied: input.dryRun ? 0 : changes.length
        },
        warnings,
        completedAt: new Date()
      }
      
      // Record activity
      await recordActivity({
        scope: "diachrony",
        entity: "evolution-batch",
        action: input.dryRun ? "dry-run" : "apply",
        summary: `Evolution batch ${jobId}: ${result.stats.changesProposed} changes, ${affectedLexemes.size} lexemes`,
        actor: input.actor ?? null,
        payload: {
          jobId: result.jobId,
          languageId: result.languageId,
          dryRun: result.dryRun,
          stats: result.stats,
          warningsCount: result.warnings.length,
          changesCount: result.changes.length
        }
      }, db)
      
      return result
    },

    async recordProvenanceTrace(trace) {
      // Store provenance in meta field of the related change log
      // This is a simplified implementation - in production you might want a dedicated table
      const provenanceData: ProvenanceTrace = {
        changeId: 0, // Will be set by the caller
        ...trace
      }
      
      // For now, return the trace as-is
      // In a full implementation, you'd persist this to a dedicated provenance_traces table
      return provenanceData
    },

    async recordSemanticDrift(input) {
      // Validate shift type against taxonomy
      if (!SEMANTIC_SHIFT_TYPES.includes(input.shiftType)) {
        throw new Error(
          `Invalid shift type: ${input.shiftType}. Must be one of: ${SEMANTIC_SHIFT_TYPES.join(", ")}`
        )
      }
      
      // Record the shift with enriched trigger data
      return this.recordSemanticShift({
        languageId: input.languageId,
        senseId: input.senseId,
        shiftType: input.shiftType,
        note: input.note ?? null,
        actor: input.actor ?? null,
        trigger: {
          ...input.trigger,
          shiftType: input.shiftType,
          targetDomain: input.targetDomain,
          validatedTaxonomy: true
        }
      })
    },

    async getDriftHeatmap(options) {
      const { languageId, startDate, endDate, groupBy, semanticFields } = options
      
      // Build date filter
      const filters = [eq(semanticShiftLogs.languageId, languageId)]
      if (startDate) filters.push(gte(semanticShiftLogs.createdAt, startDate))
      if (endDate) filters.push(lte(semanticShiftLogs.createdAt, endDate))
      const dateFilter = filters.length > 1 ? and(...filters) : filters[0]
      
      // Fetch all semantic shifts in the period
      const shifts = await db
        .select()
        .from(semanticShiftLogs)
        .where(dateFilter)
        .orderBy(semanticShiftLogs.createdAt)
      
      // Group by time period and semantic field
      const grouped = new Map<string, {
        field: string
        period: string
        shifts: SemanticShiftLogRecord[]
      }>()
      
      for (const shift of shifts) {
        const field = extractSemanticField(shift) ?? "unknown"
        
        // Filter by semantic fields if specified
        if (semanticFields && !semanticFields.includes(field)) {
          continue
        }
        
        const period = formatPeriod(shift.createdAt, groupBy)
        const key = `${field}:${period}`
        
        if (!grouped.has(key)) {
          grouped.set(key, { field, period, shifts: [] })
        }
        grouped.get(key)!.shifts.push(shift)
      }
      
      // Calculate heatmap entries
      const entries: DriftHeatmapEntry[] = []
      const maxCount = Math.max(...Array.from(grouped.values()).map(g => g.shifts.length), 1)
      
      for (const { field, period, shifts } of grouped.values()) {
        const shiftTypeCounts = new Map<string, number>()
        
        for (const shift of shifts) {
          const type = shift.shiftType
          shiftTypeCounts.set(type, (shiftTypeCounts.get(type) ?? 0) + 1)
        }
        
        const dominantType = Array.from(shiftTypeCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] as SemanticShiftType | undefined
        
        entries.push({
          semanticField: field,
          period,
          shiftCount: shifts.length,
          dominantShiftType: dominantType ?? "generalization",
          intensity: shifts.length / maxCount
        })
      }
      
      return entries.sort((a, b) => a.period.localeCompare(b.period))
    }
  }
}

export const diachronyService = createDiachronyService()
