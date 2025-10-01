import { getDb, type DbClient } from "../../db/client"
import { patternSets, patternSetMembers, rootPatternRequirements, rootPatternBindings } from "../../db/schema/core"
import { inArray } from "drizzle-orm"

type ValidatorStatus = "pass" | "fail"

export interface PatternCompletenessIssue {
  rootId: number
  patternSetId: number
  requiredPatternIds: number[]
  boundPatternIds: number[]
}

export interface PatternCompletenessResult {
  id: "morphology.patternCompleteness"
  name: string
  description: string
  status: ValidatorStatus
  summary: string
  totalRequirements: number
  failures: PatternCompletenessIssue[]
}

export async function validatePatternCompleteness(db: DbClient = getDb()): Promise<PatternCompletenessResult> {
  // Load all requirements
  let requirements: any[] = []
  try {
    requirements = await db.select().from(rootPatternRequirements)
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    if (msg.includes('does not exist') || msg.includes('no such table') || err?.code === '42P01') {
      return {
        id: 'morphology.patternCompleteness',
        name: 'Pattern completeness',
        description: 'Ensures roots satisfy their required pattern set bindings.',
        status: 'fail',
        summary: 'Validation tables are missing; run migrations (e.g. 0003_validation_extensions.sql)',
        totalRequirements: 0,
        failures: []
      }
    }
    throw err
  }

  // Preload members for pattern sets referenced
  const patternSetIds = Array.from(new Set(requirements.map((r: any) => r.patternSetId)))
  const members = patternSetIds.length > 0
    ? await db.select().from(patternSetMembers).where(inArray(patternSetMembers.patternSetId, patternSetIds))
    : []

  const membersBySet = new Map<number, number[]>()
  for (const m of members) {
    const list = membersBySet.get(m.patternSetId) ?? []
    list.push(m.patternId)
    membersBySet.set(m.patternSetId, list)
  }

  // Preload bindings for all involved roots
  const rootIds = Array.from(new Set(requirements.map((r: any) => r.rootId)))
  const bindings = rootIds.length > 0
    ? await db.select().from(rootPatternBindings).where(inArray(rootPatternBindings.rootId, rootIds))
    : []

  const bindingsByRoot = new Map<number, number[]>()
  for (const b of bindings) {
    const list = bindingsByRoot.get(b.rootId) ?? []
    list.push(b.patternId)
    bindingsByRoot.set(b.rootId, list)
  }

  const failures: PatternCompletenessIssue[] = []

  for (const req of requirements) {
    const required = membersBySet.get(req.patternSetId) ?? []
    const bound = bindingsByRoot.get(req.rootId) ?? []

    const intersects = required.some((pid) => bound.includes(pid))
    if (!intersects) {
      failures.push({
        rootId: req.rootId,
        patternSetId: req.patternSetId,
        requiredPatternIds: required,
        boundPatternIds: bound
      })
    }
  }

  const status: ValidatorStatus = failures.length === 0 ? "pass" : "fail"
  const summary = status === "pass"
    ? "All required pattern sets have at least one binding per root."
    : `${failures.length} missing required pattern bindings.`

  return {
    id: "morphology.patternCompleteness",
    name: "Pattern completeness",
    description: "Ensures roots satisfy their required pattern set bindings.",
    status,
    summary,
    totalRequirements: requirements.length,
    failures
  }
}
