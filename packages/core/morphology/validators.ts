import { getDb, type DbClient } from "../../db/client"
import { patterns } from "../../db/schema/core"

export type ValidatorStatus = "pass" | "fail"

export interface PatternLegalityFinding {
  patternId: number
  patternName: string
  slotCount: number
  detectedSlots: number
  skeleton: string
}

export interface PatternLegalityValidatorResult {
  id: "morphology.patternLegality"
  name: string
  description: string
  status: ValidatorStatus
  summary: string
  patternCount: number
  findings: PatternLegalityFinding[]
}

function countSkeletonSlots(skeleton: string): number {
  const matches = skeleton.match(/[A-Z](?:\d+)?/g)
  return matches?.length ?? 0
}

export async function validatePatternLegality(
  db: DbClient = getDb()
): Promise<PatternLegalityValidatorResult> {
  const rows = await db
    .select({
      id: patterns.id,
      name: patterns.name,
      skeleton: patterns.skeleton,
      slotCount: patterns.slotCount
    })
    .from(patterns)
    .orderBy(patterns.createdAt)

  const findings: PatternLegalityFinding[] = []

  for (const pattern of rows) {
    const detected = countSkeletonSlots(pattern.skeleton ?? "")
    if (detected !== pattern.slotCount) {
      findings.push({
        patternId: pattern.id,
        patternName: pattern.name ?? `Pattern #${pattern.id}`,
        slotCount: pattern.slotCount,
        detectedSlots: detected,
        skeleton: pattern.skeleton ?? ""
      })
    }
  }

  const patternCount = rows.length
  const missing = findings.length
  const status: ValidatorStatus = missing === 0 ? "pass" : "fail"
  const name = "Pattern legality (slot count vs skeleton)"
  const description = "Checks that a pattern's slotCount matches the number of slot placeholders present in its skeleton string."

  const summary = missing === 0
    ? "All patterns have matching slot counts and skeleton placeholders."
    : `${missing} pattern${missing === 1 ? "" : "s"} have slotCount and skeleton placeholder mismatches.`

  return {
    id: "morphology.patternLegality",
    name,
    description,
    status,
    summary,
    patternCount,
    findings
  }
}
