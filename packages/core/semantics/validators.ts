import { sql, eq } from "drizzle-orm"
import { getDb, type DbClient } from "../../db/client"
import { lexemeSenses, semanticFrames, senseRelations } from "../../db/schema/core"
import type { FrameRole } from "./roles"

export type ValidatorStatus = "pass" | "fail"

export interface OrphanSenseFinding {
  senseId: number
  frameId: number
  frameName: string | null
  frameSlug: string | null
  gloss: string
  definition: string | null
  createdAt: string
}

export interface OrphanSenseValidatorResult {
  id: "semantics.orphanSense"
  name: string
  description: string
  status: ValidatorStatus
  summary: string
  orphanCount: number
  totalSenses: number
  findings: OrphanSenseFinding[]
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  return new Date(value).toISOString()
}

export async function validateOrphanSenses(db: DbClient = getDb()): Promise<OrphanSenseValidatorResult> {
  const relationCountExpr = sql<number>`(
    SELECT COUNT(*)
    FROM ${senseRelations} sr
    WHERE sr.source_sense_id = ${lexemeSenses.id}
       OR sr.target_sense_id = ${lexemeSenses.id}
  )`

  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(lexemeSenses)
  const totalSenses = totalRow?.count ?? 0

  const rows = await db
    .select({
      senseId: lexemeSenses.id,
      frameId: lexemeSenses.frameId,
      gloss: lexemeSenses.gloss,
      definition: lexemeSenses.definition,
      createdAt: lexemeSenses.createdAt,
      frameName: semanticFrames.name,
      frameSlug: semanticFrames.slug,
      relationCount: relationCountExpr
    })
    .from(lexemeSenses)
    .leftJoin(semanticFrames, eq(semanticFrames.id, lexemeSenses.frameId))
    .where(sql`${relationCountExpr} = 0`)
    .orderBy(lexemeSenses.createdAt)

  const findings: OrphanSenseFinding[] = rows.map((row) => ({
    senseId: row.senseId,
    frameId: row.frameId,
    frameName: row.frameName ?? null,
    frameSlug: row.frameSlug ?? null,
    gloss: row.gloss,
    definition: row.definition ?? null,
    createdAt: toIsoString(row.createdAt)
  }))

  const orphanCount = findings.length
  const status: ValidatorStatus = orphanCount === 0 ? "pass" : "fail"
  const name = "Orphan sense detection"
  const description = "Identifies senses that are not connected to any semantic relations."
  const summary = orphanCount === 0
    ? "All senses participate in at least one relation."
    : `${orphanCount} orphan sense${orphanCount === 1 ? "" : "s"} detected.\nSenses should participate in at least one semantic relation.`

  return {
    id: "semantics.orphanSense",
    name,
    description,
    status,
    summary,
    orphanCount,
    totalSenses,
    findings
  }
}

function normalizeRoleName(name: string): string {
  return name.trim().toLowerCase()
}

function isRoleRequired(role: FrameRole): boolean {
  const cardinality = role.cardinality.trim()
  if (cardinality === "1") return true
  if (cardinality.toLowerCase().startsWith("1..")) return true
  return false
}

type StoredFrameRoles = FrameRole[] | null | undefined

function coerceRoles(value: unknown): FrameRole[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is FrameRole => {
      return Boolean(entry && typeof entry.name === "string" && typeof entry.cardinality === "string")
    })
  }
  return []
}

export interface RoleFillFinding {
  frameId: number
  frameName: string | null
  frameSlug: string | null
  requiredRole: string
}

export interface RoleFillValidatorResult {
  id: "semantics.roleFilling"
  name: string
  description: string
  status: ValidatorStatus
  summary: string
  framesChecked: number
  missingAssignments: number
  findings: RoleFillFinding[]
}

export async function validateIncompleteRoleFilling(
  db: DbClient = getDb()
): Promise<RoleFillValidatorResult> {
  const frames = await db.select().from(semanticFrames)

  const relationRows = await db
    .select({
      frameId: lexemeSenses.frameId,
      relationType: senseRelations.relationType
    })
    .from(senseRelations)
    .innerJoin(lexemeSenses, eq(lexemeSenses.id, senseRelations.sourceSenseId))

  const coverage = new Map<string, number>()
  for (const row of relationRows) {
    const relationType = row.relationType ?? ""
    if (!relationType.toLowerCase().startsWith("role:")) continue
    const roleName = relationType.slice(5)
    const key = `${row.frameId}|${normalizeRoleName(roleName)}`
    coverage.set(key, (coverage.get(key) ?? 0) + 1)
  }

  const findings: RoleFillFinding[] = []
  let framesWithRequirements = 0

  for (const frame of frames) {
    const roles = coerceRoles(frame.roles as StoredFrameRoles)
    const requiredRoles = roles.filter(isRoleRequired)

    if (requiredRoles.length === 0) continue
    framesWithRequirements += 1

    for (const role of requiredRoles) {
      const key = `${frame.id}|${normalizeRoleName(role.name)}`
      if ((coverage.get(key) ?? 0) === 0) {
        findings.push({
          frameId: frame.id,
          frameName: frame.name ?? null,
          frameSlug: frame.slug ?? null,
          requiredRole: role.name
        })
      }
    }
  }

  const missingAssignments = findings.length
  const status: ValidatorStatus = missingAssignments === 0 ? "pass" : "fail"
  const name = "Incomplete role filling in sample generations"
  const description = "Ensures every required frame role appears in sample role assignments (relationType=role:ROLE)."
  const summary = missingAssignments === 0
    ? "All required roles are represented in sample generations."
    : `${missingAssignments} required role assignment${missingAssignments === 1 ? "" : "s"} missing across ${framesWithRequirements} frame${framesWithRequirements === 1 ? "" : "s"}.`

  return {
    id: "semantics.roleFilling",
    name,
    description,
    status,
    summary,
    framesChecked: framesWithRequirements,
    missingAssignments,
    findings
  }
}
