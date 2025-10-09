import { eq, type InferInsertModel } from "drizzle-orm"
import { getDb } from "../../db/client"
import { patterns, roots, usageStats } from "../../db/schema/core"
import type { PatternRecord, RootRecord } from "./types"
import { emitMorphologyEvent, type MorphologyEntity, type MorphologyEventAction, type MorphologyEventPayloadMap } from "./events"
import { recordActivity } from "@core/activity"

type DbClient = ReturnType<typeof getDb>

type RootInsert = InferInsertModel<typeof roots>
type PatternInsert = InferInsertModel<typeof patterns>

export interface CreateRootInput {
  representation: string
  gloss?: string | null
}

export type UpdateRootInput = Partial<CreateRootInput>

export interface CreatePatternInput {
  name: string
  skeleton: string
  slotCount: number
}

export type UpdatePatternInput = Partial<CreatePatternInput>

export interface MorphologyService {
  listRoots(): Promise<RootRecord[]>
  getRootById(id: number): Promise<RootRecord | null>
  createRoot(input: CreateRootInput): Promise<RootRecord>
  updateRoot(id: number, patch: UpdateRootInput): Promise<RootRecord | null>
  deleteRoot(id: number): Promise<boolean>

  /**
   * Attempt to classify a surface form for morphological integration.
   * Returns candidate matches with metadata ordered by score.
   */
  classifyIntegration(surface: string): Promise<Array<{
    rootId?: number
    patternId?: number
    score: number
    rootNormalized?: string
    patternSkeleton?: string
    normalizedSurface?: string
  }>>

  listPatterns(): Promise<PatternRecord[]>
  getPatternById(id: number): Promise<PatternRecord | null>
  createPattern(input: CreatePatternInput): Promise<PatternRecord>
  updatePattern(id: number, patch: UpdatePatternInput): Promise<PatternRecord | null>
  deletePattern(id: number): Promise<boolean>
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function extractDisplayLabel<E extends MorphologyEntity>(entity: E, data: MorphologyEventPayloadMap[E]): string {
  if (entity === "root") {
    const root = data as MorphologyEventPayloadMap["root"]
    return root.representation ?? `#${root.id}`
  }
  if (entity === "pattern") {
    const pattern = data as MorphologyEventPayloadMap["pattern"]
    return pattern.name ?? `#${pattern.id}`
  }
  return `#${(data as { id: number }).id}`
}

function toPlainJson<T>(value: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value ?? {}))
}

async function logMorphologyActivity<E extends MorphologyEntity>(
  entity: E,
  action: MorphologyEventAction,
  data: MorphologyEventPayloadMap[E],
  db: DbClient
) {
  const label = extractDisplayLabel(entity, data)
  const summary = `${sentenceCase(entity)} “${label}” ${action}`

  await recordActivity({
    scope: "morphology",
    entity,
    action,
    summary,
    payload: toPlainJson(data)
  }, db)
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as Partial<T>
}

function prepareRootInsert(input: CreateRootInput): RootInsert {
  return {
    representation: input.representation,
    gloss: input.gloss ?? null
  }
}

function preparePatternInsert(input: CreatePatternInput): PatternInsert {
  return {
    name: input.name,
    skeleton: input.skeleton,
    slotCount: input.slotCount
  }
}

export function createMorphologyService(db: DbClient = getDb()): MorphologyService {
  const service: MorphologyService = {
    async listRoots() {
      return db.select().from(roots).orderBy(roots.createdAt)
    },

    async getRootById(id: number) {
      const [row] = await db.select().from(roots).where(eq(roots.id, id)).limit(1)
      return row ?? null
    },

    async createRoot(input: CreateRootInput) {
      const [created] = await db.insert(roots).values(prepareRootInsert(input)).returning()
      emitMorphologyEvent({ entity: "root", action: "created", data: created })
      await logMorphologyActivity("root", "created", created, db)
      return created
    },

    async updateRoot(id: number, patch: UpdateRootInput) {
      const updates = stripUndefined({
        representation: patch.representation,
        gloss: patch.gloss !== undefined ? patch.gloss : undefined
      })

      if (Object.keys(updates).length === 0) {
        return service.getRootById(id)
      }

      const [updated] = await db
        .update(roots)
        .set(updates)
        .where(eq(roots.id, id))
        .returning()

      if (updated) {
        emitMorphologyEvent({ entity: "root", action: "updated", data: updated })
        await logMorphologyActivity("root", "updated", updated, db)
      }

      return updated ?? null
    },

    async deleteRoot(id: number) {
      const [deleted] = await db
        .delete(roots)
        .where(eq(roots.id, id))
        .returning()

      if (!deleted) {
        return false
      }

      emitMorphologyEvent({ entity: "root", action: "deleted", data: deleted })
      await logMorphologyActivity("root", "deleted", deleted, db)
      return true
    },

    async listPatterns() {
      return db.select().from(patterns).orderBy(patterns.createdAt)
    },

    async getPatternById(id: number) {
      const [row] = await db.select().from(patterns).where(eq(patterns.id, id)).limit(1)
      return row ?? null
    },

    async createPattern(input: CreatePatternInput) {
      const [created] = await db.insert(patterns).values(preparePatternInsert(input)).returning()
      emitMorphologyEvent({ entity: "pattern", action: "created", data: created })
      await logMorphologyActivity("pattern", "created", created, db)
      return created
    },

    async updatePattern(id: number, patch: UpdatePatternInput) {
      const updates = stripUndefined({
        name: patch.name,
        skeleton: patch.skeleton,
        slotCount: patch.slotCount
      })

      if (Object.keys(updates).length === 0) {
        return service.getPatternById(id)
      }

      const [updated] = await db
        .update(patterns)
        .set(updates)
        .where(eq(patterns.id, id))
        .returning()

      if (updated) {
        emitMorphologyEvent({ entity: "pattern", action: "updated", data: updated })
        await logMorphologyActivity("pattern", "updated", updated, db)
      }

      return updated ?? null
    },

    async deletePattern(id: number) {
      const [deleted] = await db
        .delete(patterns)
        .where(eq(patterns.id, id))
        .returning()

      if (!deleted) {
        return false
      }

      emitMorphologyEvent({ entity: "pattern", action: "deleted", data: deleted })
      await logMorphologyActivity("pattern", "deleted", deleted, db)
      return true
    }

    ,

    async classifyIntegration(surface: string) {
      const allRoots = await db.select().from(roots).orderBy(roots.createdAt)
      const allPatterns = await db.select().from(patterns).orderBy(patterns.createdAt)

      const candidates: Array<{ rootId?: number; patternId?: number; score: number; rootNormalized?: string; patternSkeleton?: string; normalizedSurface?: string }> = []

      // Normalization helpers
      const norm = (s: string) => s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase()
      const lettersOnly = (s: string) => norm(s).replace(/[^a-z]/g, '')
      const cvSkeleton = (s: string) => {
        const v = 'aeiou'
        return lettersOnly(s).split('').map((ch) => (v.includes(ch) ? 'V' : 'C')).join('')
      }

      const nSurf = norm(surface)
      const lettersSurf = lettersOnly(surface)
      const cvSurf = cvSkeleton(surface)

  // Roots: match by consonant skeleton and substring; score by consonant-match length + substring bonus
      for (const r of allRoots) {
        const repRaw = r.representation ?? ''
        const rep = norm(repRaw)
        const repLetters = lettersOnly(repRaw)
        const repCv = cvSkeleton(repRaw)
        if (!rep) continue

        let score = 0
  if (lettersSurf.includes(repLetters) && repLetters.length > 0) score += repLetters.length * 3
  // consonant-only matching (e.g., ktb -> kitab)
  const consSurf = lettersSurf.replace(/[aeiou]/g, '')
  const repCons = repLetters.replace(/[aeiou]/g, '')
  if (repCons && (consSurf.includes(repCons) || repCons.includes(consSurf))) score += repCons.length * 4
        if (nSurf.includes(rep)) score += 10
        if (cvSurf.includes(repCv) || repCv.includes(cvSurf)) score += Math.max(0, repCv.length)

        if (score > 0) {
          candidates.push({ rootId: r.id, score, rootNormalized: rep, normalizedSurface: nSurf })
        }
      }

      // Patterns: compute skeleton letters and compare CV skeleton; prefer patterns with similar CV structure
      for (const p of allPatterns) {
        const skeletonRaw = p.skeleton ?? ''
        const skeletonLetters = skeletonRaw.replace(/[^A-Za-z]/g, '')
        const patternCv = skeletonRaw.replace(/C/g, 'C').replace(/V/g, 'V').replace(/[^CV]/g, '')
        // fallback: if patternCv is empty, derive from letters
        const patternCvFinal = patternCv || skeletonLetters.split('').map((ch) => /[aeiou]/i.test(ch) ? 'V' : 'C').join('')

        let score = 0
        // CV skeleton similarity: longer common prefix gives more points
        if (patternCvFinal && cvSurf) {
          const common = (() => {
            let i = 0
            while (i < patternCvFinal.length && i < cvSurf.length && patternCvFinal[i] === cvSurf[i]) i++
            return i
          })()
          score += common * 5
        }

        // length proximity
        const lenDiff = Math.abs((skeletonLetters || '').length - lettersSurf.length)
        score += Math.max(0, 50 - lenDiff)

        if (score > 0) candidates.push({ patternId: p.id, score, patternSkeleton: skeletonRaw, normalizedSurface: nSurf })
      }

      // Boost candidates by usage frequency from usage_stats
      const rootIds = candidates.map((c) => c.rootId).filter(Boolean) as number[]
      const patternIds = candidates.map((c) => c.patternId).filter(Boolean) as number[]

      if (rootIds.length || patternIds.length) {
        // Use raw pool query to fetch frequencies for candidate ids. This avoids complicated
        // typed Drizzle predicates and works across pg/pglite adapters in tests.
        try {
          const { getPool } = await import('../../db/client')
          const pool = getPool()
          const rootsParam = rootIds.length ? rootIds : null
          const patternsParam = patternIds.length ? patternIds : null

          const sql = `SELECT target_kind, target_id, freq FROM usage_stats WHERE
            (target_kind = 'root' AND ($1::int[] IS NULL OR target_id = ANY($1)))
            OR (target_kind = 'pattern' AND ($2::int[] IS NULL OR target_id = ANY($2)))`

          const res = await pool.query(sql, [rootsParam, patternsParam])
          const freqMap = new Map<string, number>()
          for (const row of res.rows) {
            const key = `${row.target_kind}:${row.target_id}`
            freqMap.set(key, Number(row.freq) || 0)
          }

          for (const c of candidates) {
            const key = c.rootId ? `root:${c.rootId}` : c.patternId ? `pattern:${c.patternId}` : undefined
            if (key && freqMap.has(key)) {
              const f = freqMap.get(key) || 0
              c.score += Math.log(1 + f) * 10
            }
          }
        } catch (e) {
          // If metrics table isn't present or query fails in certain adapters, ignore gracefully
        }
      }

      candidates.sort((a, b) => b.score - a.score)
      return candidates.slice(0, 10)
    }
  }

  return service
}

export const morphologyService = createMorphologyService()
