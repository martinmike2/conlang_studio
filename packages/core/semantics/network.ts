import { and, eq, inArray, sql, type SQL } from "drizzle-orm"
import { getDb } from "../../db/client"
import { lexemeSenses, senseRelations, semanticFrames } from "../../db/schema/core"
import type { SenseRelationRecord } from "./types"

type DbClient = ReturnType<typeof getDb>

export interface SenseNetworkNode {
  id: number
  frameId: number
  gloss: string
  definition: string | null
  createdAt: string
  frameName: string | null
  frameSlug: string | null
  frameDomain: string | null
  primary: boolean
}

export interface SenseNetworkEdge {
  id: number
  sourceSenseId: number
  targetSenseId: number
  relationType: string
}

export interface SenseNetworkStats {
  nodeCount: number
  edgeCount: number
  primaryCount: number
}

export interface SenseNetworkResult {
  nodes: SenseNetworkNode[]
  edges: SenseNetworkEdge[]
  stats: SenseNetworkStats
}

export interface BuildSenseNetworkOptions {
  frameId?: number
  senseIds?: number[]
  relationTypes?: string[]
}

type SenseRow = {
  id: number
  frameId: number
  gloss: string
  definition: string | null
  createdAt: Date
  frameName: string | null
  frameSlug: string | null
  frameDomain: string | null
}

function mapSenseRow(row: SenseRow, primary: boolean): SenseNetworkNode {
  return {
    id: row.id,
    frameId: row.frameId,
    gloss: row.gloss,
    definition: row.definition ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    frameName: row.frameName ?? null,
    frameSlug: row.frameSlug ?? null,
    frameDomain: row.frameDomain ?? null,
    primary
  }
}

function buildSenseSelect(db: DbClient) {
  return db
    .select({
      id: lexemeSenses.id,
      frameId: lexemeSenses.frameId,
      gloss: lexemeSenses.gloss,
      definition: lexemeSenses.definition,
      createdAt: lexemeSenses.createdAt,
      frameName: semanticFrames.name,
      frameSlug: semanticFrames.slug,
      frameDomain: semanticFrames.domain
    })
    .from(lexemeSenses)
    .leftJoin(semanticFrames, eq(semanticFrames.id, lexemeSenses.frameId))
    .$dynamic()
}

function toEdge(relation: SenseRelationRecord): SenseNetworkEdge {
  return {
    id: relation.id,
    sourceSenseId: relation.sourceSenseId,
    targetSenseId: relation.targetSenseId,
    relationType: relation.relationType
  }
}

export async function buildSenseNetwork(
  options: BuildSenseNetworkOptions = {},
  db: DbClient = getDb()
): Promise<SenseNetworkResult> {
  const senseConditions: SQL[] = []

  if (options.frameId !== undefined) {
    senseConditions.push(eq(lexemeSenses.frameId, options.frameId))
  }

  if (options.senseIds && options.senseIds.length > 0) {
    const values = options.senseIds as [number, ...number[]]
    const condition = inArray(lexemeSenses.id, values)!
    senseConditions.push(condition)
  }

  let senseQuery = buildSenseSelect(db)
  if (senseConditions.length === 1) {
    senseQuery = senseQuery.where(senseConditions[0])
  } else if (senseConditions.length > 1) {
    senseQuery = senseQuery.where(and(...senseConditions))
  }

  const primaryRows = await senseQuery.orderBy(lexemeSenses.createdAt)
  const nodeMap = new Map<number, SenseNetworkNode>()
  const primaryIds = new Set<number>()

  for (const row of primaryRows) {
    const node = mapSenseRow(row, true)
    nodeMap.set(node.id, node)
    primaryIds.add(node.id)
  }

  const shouldFilterRelations = options.frameId !== undefined || (options.senseIds?.length ?? 0) > 0
  const relationConditions: SQL[] = []

  if (options.relationTypes && options.relationTypes.length > 0) {
    const relationCondition = inArray(
      senseRelations.relationType,
      options.relationTypes as [string, ...string[]]
    )!
    relationConditions.push(relationCondition)
  }

  let relations: SenseRelationRecord[] = []

  if (shouldFilterRelations && primaryIds.size === 0) {
    relations = []
  } else {
    if (shouldFilterRelations && primaryIds.size > 0) {
      const idsArray = Array.from(primaryIds)
      if (idsArray.length > 0) {
        const tuple = idsArray as [number, ...number[]]
        const sourceCondition = inArray(senseRelations.sourceSenseId, tuple)!
        const targetCondition = inArray(senseRelations.targetSenseId, tuple)!
        relationConditions.push(sql`${sourceCondition} or ${targetCondition}`)
      }
    }

    let relationQuery = db.select().from(senseRelations).$dynamic()
    if (relationConditions.length === 1) {
      relationQuery = relationQuery.where(relationConditions[0])
    } else if (relationConditions.length > 1) {
      relationQuery = relationQuery.where(and(...relationConditions))
    }

    relations = await relationQuery
  }

  const relatedSenseIds = new Set<number>()
  for (const relation of relations) {
    relatedSenseIds.add(relation.sourceSenseId)
    relatedSenseIds.add(relation.targetSenseId)
  }

  const missingIds = Array.from(relatedSenseIds).filter((id) => !nodeMap.has(id))
  if (missingIds.length > 0) {
    const extraCondition = inArray(lexemeSenses.id, missingIds as [number, ...number[]])!
    const extraRows = await buildSenseSelect(db).where(extraCondition)
    for (const row of extraRows) {
      const node = mapSenseRow(row, false)
      nodeMap.set(node.id, node)
    }
  }

  // Ensure all primary senses exist in the map even if there were no edges
  for (const row of primaryRows) {
    if (!nodeMap.has(row.id)) {
      nodeMap.set(row.id, mapSenseRow(row, true))
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => {
    if (a.primary !== b.primary) {
      return a.primary ? -1 : 1
    }
    const createdComparison = a.createdAt.localeCompare(b.createdAt)
    if (createdComparison !== 0) return createdComparison
    return a.id - b.id
  })

  const edges = relations.map(toEdge).sort((a, b) => a.id - b.id)

  return {
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      primaryCount: nodes.filter((node) => node.primary).length
    }
  }
}
