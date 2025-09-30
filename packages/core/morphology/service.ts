import { eq, type InferInsertModel } from "drizzle-orm"
import { getDb } from "../../db/client"
import { patterns, roots } from "../../db/schema/core"
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
  }

  return service
}

export const morphologyService = createMorphologyService()
