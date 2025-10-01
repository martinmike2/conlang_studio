import { sql, inArray } from "drizzle-orm"

import { getDb, type DbClient } from "../../db/client"
import { toneAssociations, toneTargets } from "../../db/schema/core"

export type ValidatorStatus = "pass" | "fail"

export type ToneAssociationIssueType = "missing" | "duplicate" | "dangling"

export interface ToneAssociationIssue {
  type: ToneAssociationIssueType
  targetId?: number
  lexemeId?: number | null
  slotIndex?: number
  duplicateAssociationIds?: number[]
  associationId?: number
  tone?: string
}

export interface ToneAssociationValidatorResult {
  id: "phonology.toneAssociation"
  name: string
  description: string
  status: ValidatorStatus
  summary: string
  totalTargets: number
  strandedTargets: number
  duplicateTargets: number
  danglingAssociations: number
  issues: ToneAssociationIssue[]
}

interface TargetStats {
  targetId: number
  lexemeId: number | null
  slotIndex: number
  associationCount: number
}

export async function validateToneAssociations(db: DbClient = getDb()): Promise<ToneAssociationValidatorResult> {
  // Use a LEFT JOIN + GROUP BY to reliably compute association counts per target
  let targetRows: TargetStats[] = []
  try {
    targetRows = await db
      .select({
        targetId: toneTargets.id,
        lexemeId: toneTargets.lexemeId,
        slotIndex: toneTargets.slotIndex,
        associationCount: sql<number>`COALESCE(COUNT(${toneAssociations}.id), 0)`
      })
      .from(toneTargets)
      .leftJoin(toneAssociations, sql`${toneAssociations}.target_id = ${toneTargets}.id`)
      .groupBy(toneTargets.id, toneTargets.lexemeId, toneTargets.slotIndex)
      .orderBy(toneTargets.id)
  } catch (err: any) {
    // Detect missing-table errors (Postgres 42P01 or messages including "does not exist") and return a helpful result
    const msg = err?.message ?? String(err)
    if (msg.includes('does not exist') || msg.includes('no such table') || err?.code === '42P01') {
      return {
        id: 'phonology.toneAssociation',
        name: 'Tone association integrity',
        description: 'Ensures each tone target has exactly one associated surface tone and no dangling associations remain.',
        status: 'fail',
        summary: 'Validation tables are missing; run migrations (e.g. 0003_validation_extensions.sql)',
        totalTargets: 0,
        strandedTargets: 0,
        duplicateTargets: 0,
        danglingAssociations: 0,
        issues: []
      }
    }
    throw err
  }

  const stranded = targetRows.filter((row) => Number(row.associationCount) === 0)
  const duplicateTargets = targetRows.filter((row) => Number(row.associationCount) > 1)

  let duplicateIssues: ToneAssociationIssue[] = []
  if (duplicateTargets.length > 0) {
    const duplicateTargetIds = duplicateTargets.map((row) => row.targetId)
    const duplicateAssociations = await db
      .select({
        associationId: toneAssociations.id,
        targetId: toneAssociations.targetId,
        tone: toneAssociations.tone
      })
      .from(toneAssociations)
      .where(inArray(toneAssociations.targetId, duplicateTargetIds))

    const grouped = new Map<number, number[]>()
    const toneByAssociation = new Map<number, string>()
    for (const row of duplicateAssociations) {
      const targetId = Number(row.targetId)
      const associationId = Number(row.associationId)
      const list = grouped.get(targetId) ?? []
      list.push(associationId)
      grouped.set(targetId, list)
      toneByAssociation.set(associationId, row.tone)
    }

    duplicateIssues = duplicateTargets.map((target) => ({
      type: "duplicate" as const,
      targetId: Number(target.targetId),
      lexemeId: target.lexemeId == null ? null : Number(target.lexemeId),
      slotIndex: Number(target.slotIndex),
      duplicateAssociationIds: grouped.get(Number(target.targetId)) ?? [],
      tone: (grouped.get(Number(target.targetId)) ?? []).map((id) => toneByAssociation.get(id)).join(", ") || undefined
    }))
  }

  const danglingAssociations = await db
    .select({
      associationId: toneAssociations.id,
      targetId: toneAssociations.targetId,
      tone: toneAssociations.tone
    })
    .from(toneAssociations)
    .where(sql`NOT EXISTS (SELECT 1 FROM ${toneTargets} tt WHERE tt.id = ${toneAssociations.targetId})`)

  const danglingIssues: ToneAssociationIssue[] = danglingAssociations.map((row) => ({
    type: "dangling",
    associationId: Number(row.associationId),
    targetId: Number(row.targetId),
    tone: row.tone
  }))

  const missingIssues: ToneAssociationIssue[] = stranded.map((target) => ({
    type: "missing",
    targetId: Number(target.targetId),
    lexemeId: target.lexemeId == null ? null : Number(target.lexemeId),
    slotIndex: Number(target.slotIndex)
  }))

  const issues: ToneAssociationIssue[] = [...missingIssues, ...duplicateIssues, ...danglingIssues]

  const totalTargets = targetRows.length
  const strandedTargets = missingIssues.length
  const duplicateTargetCount = duplicateIssues.length
  const danglingCount = danglingIssues.length

  const status: ValidatorStatus = issues.length === 0 ? "pass" : "fail"
  const name = "Tone association integrity"
  const description = "Ensures each tone target has exactly one associated surface tone and no dangling associations remain."

  let summary: string
  if (status === "pass") {
    summary = "All tone targets are associated with exactly one tone."
  } else {
    const parts: string[] = []
    if (strandedTargets > 0) parts.push(`${strandedTargets} stranded target${strandedTargets === 1 ? "" : "s"}`)
    if (duplicateTargetCount > 0) parts.push(`${duplicateTargetCount} duplicate mapping${duplicateTargetCount === 1 ? "" : "s"}`)
    if (danglingCount > 0) parts.push(`${danglingCount} dangling association${danglingCount === 1 ? "" : "s"}`)
    summary = parts.join(", ")
  }

  return {
    id: "phonology.toneAssociation",
    name,
    description,
    status,
    summary,
    totalTargets,
    strandedTargets,
    duplicateTargets: duplicateTargetCount,
    danglingAssociations: danglingCount,
    issues
  }
}
