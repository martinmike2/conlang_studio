/**
 * Minimal Variant Overlay engine.
 *
 * An overlay is a list of ops that modify a base rule set. Ops are simple
 * objects: { action: 'add'|'update'|'remove', id?: number, pattern?: string, replacement?: string, priority?: number }
 */

export type OverlayOp = {
  action: 'add' | 'update' | 'remove'
  id?: number
  pattern?: string
  replacement?: string
  priority?: number
  meta?: Record<string, unknown>
}

export type Rule = {
  id: number
  pattern: string
  replacement: string
  priority: number
  meta?: Record<string, unknown>
}

export type Conflict = {
  opIndex: number
  reason: string
  op: OverlayOp
}

export type OverlayResult = {
  base: Rule[]
  applied: Rule[]
  conflicts: Conflict[]
}

/**
 * Apply an overlay onto a base set of rules in-memory, returning the resulting
 * rule list and any detected conflicts.
 */
export function applyOverlay(base: Rule[], ops: OverlayOp[]): OverlayResult {
  // Use a map by id for quick lookup. Clone base so we don't mutate caller data.
  const rulesById = new Map<number, Rule>()
  for (const r of base) rulesById.set(r.id, { ...r })

  let nextGeneratedId = Math.max(0, ...Array.from(rulesById.keys())) + 1

  const applied: Rule[] = []
  const conflicts: Conflict[] = []

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    try {
      if (op.action === 'add') {
        if (!op.pattern || !op.replacement) {
          conflicts.push({ opIndex: i, reason: 'add missing pattern or replacement', op })
          continue
        }

        if (typeof op.id === 'number' && rulesById.has(op.id)) {
          conflicts.push({ opIndex: i, reason: `add id ${op.id} already exists`, op })
          continue
        }

        const duplicate = Array.from(rulesById.values()).find((r) => r.pattern === op.pattern && r.priority === (op.priority ?? r.priority))
        if (duplicate) {
          conflicts.push({ opIndex: i, reason: `add would duplicate pattern at priority with rule id=${duplicate.id}`, op })
          continue
        }

        const assignedId = typeof op.id === 'number' ? op.id : (() => {
          while (rulesById.has(nextGeneratedId)) nextGeneratedId += 1
          return nextGeneratedId++
        })()

        const newRule: Rule = { id: assignedId, pattern: op.pattern, replacement: op.replacement, priority: op.priority ?? 1000, meta: op.meta }
        rulesById.set(newRule.id, newRule)
      } else if (op.action === 'update') {
        if (typeof op.id !== 'number') {
          conflicts.push({ opIndex: i, reason: 'update missing id', op })
          continue
        }
        const existing = rulesById.get(op.id)
        if (!existing) {
          conflicts.push({ opIndex: i, reason: `update: target id ${op.id} does not exist`, op })
          continue
        }
        // apply fields
        const updated: Rule = { ...existing }
        if (op.pattern !== undefined) updated.pattern = op.pattern
        if (op.replacement !== undefined) updated.replacement = op.replacement
        if (op.priority !== undefined) updated.priority = op.priority
        if (op.meta !== undefined) updated.meta = op.meta
        rulesById.set(updated.id, updated)
      } else if (op.action === 'remove') {
        if (typeof op.id !== 'number') {
          conflicts.push({ opIndex: i, reason: 'remove missing id', op })
          continue
        }
        if (!rulesById.has(op.id)) {
          conflicts.push({ opIndex: i, reason: `remove: target id ${op.id} does not exist`, op })
          continue
        }
        rulesById.delete(op.id)
      } else {
        conflicts.push({ opIndex: i, reason: `unknown action ${String((op as any).action)}`, op })
      }
    } catch (err) {
      conflicts.push({ opIndex: i, reason: `exception applying op: ${String(err)}`, op })
    }
  }

  // produce applied list sorted by priority
  const final = Array.from(rulesById.values()).sort((a, b) => a.priority - b.priority)
  applied.push(...final)

  return { base: [...base], applied, conflicts }
}

export function explainConflict(c: Conflict): string {
  return `Op #${c.opIndex}: ${c.reason}`
}

// Persistence helpers (requires drizzle client - loaded lazily to avoid circular deps)
import { eq } from 'drizzle-orm'
export type VariantOverlayRecord = {
  id: number
  languageId?: number | null
  name: string
  ops: OverlayOp[]
  meta?: Record<string, unknown>
  createdAt: string
}

export async function createOverlay(db: any, input: { languageId?: number | null; name: string; ops: OverlayOp[]; meta?: Record<string, unknown> }) {
  // Basic validation of ops before persisting to avoid storing malformed data.
  if (!Array.isArray(input.ops)) throw new Error('ops must be an array')
  for (let i = 0; i < input.ops.length; i++) {
    const op = input.ops[i]
    if (!op || typeof op !== 'object') throw new Error(`op[${i}] must be an object`)
    if (!('action' in op)) throw new Error(`op[${i}] missing action`)
    const a = op.action
    if (a !== 'add' && a !== 'update' && a !== 'remove') throw new Error(`op[${i}] invalid action: ${String(a)}`)
    if (a === 'add') {
      if (typeof op.pattern !== 'string' || typeof op.replacement !== 'string') throw new Error(`op[${i}] add requires pattern and replacement`)
    }
    if (a === 'update' || a === 'remove') {
      if (typeof op.id !== 'number') throw new Error(`op[${i}] ${a} requires numeric id`)
    }
  }

  const [created] = await db.insert((db as any).variantOverlays).values({ languageId: input.languageId, name: input.name, ops: input.ops, meta: input.meta ?? {} }).returning()
  return created as VariantOverlayRecord
}

export async function listOverlays(db: any, filter?: { languageId?: number }) {
  let q = db.select().from((db as any).variantOverlays)
  if (filter?.languageId) q = q.where(eq((db as any).variantOverlays.languageId, filter.languageId))
  // Return concrete rows (await the query) so callers receive an array, not a query builder
  const rows = await q
  return rows as VariantOverlayRecord[]
}

export async function getOverlay(db: any, id: number) {
  const rows = await db.select().from((db as any).variantOverlays).where(eq((db as any).variantOverlays.id, id))
  return rows[0] ?? null
}

// Convenience: apply overlay by id to a base rules set (loanRules table example)
export async function applyOverlayToLoanRules(db: any, overlayId: number, rulesetId: number) {
  const ov = await getOverlay(db, overlayId)
  if (!ov) throw new Error('overlay not found')
  // fetch loan rules for rulesetId
  const loanRules = (db as any).loanRules
  const rows = await db.select().from(loanRules).where(loanRules.rulesetId, rulesetId).orderBy(loanRules.priority)
  // map rows to Rule[]
  const base: Rule[] = rows.map((r: any) => ({ id: r.id, pattern: r.pattern, replacement: r.replacement, priority: r.priority ?? 100 }))
  const out = applyOverlay(base, ov.ops as OverlayOp[])
  return out
}
