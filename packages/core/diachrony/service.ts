import { and, desc, eq, gte, lt, type InferInsertModel, type SQL } from "drizzle-orm"

import { getDb } from "../../db/client"
import { lexicalChangeLogs, semanticShiftLogs } from "../../db/schema/core"
import { recordActivity } from "@core/activity"
import type { DiachronyTimelineEntry, LexicalChangeLogRecord, SemanticShiftLogRecord } from "./types"

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
}

function clampLimit(limit?: number): number {
  if (!limit) return DEFAULT_LIMIT
  return Math.min(Math.max(limit, 1), MAX_LIMIT)
}

function toPlainJson(value?: Record<string, unknown> | null): Record<string, unknown> {
  if (!value) return {}
  return JSON.parse(JSON.stringify(value))
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
    }
  }
}

export const diachronyService = createDiachronyService()
