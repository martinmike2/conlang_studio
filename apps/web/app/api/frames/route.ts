import { NextRequest } from 'next/server'
import { getDb, schema } from '../../../../../packages/db/client'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { parseJson, success, jsonError } from '../_util/respond'
import { slugify } from '../../../lib/utils/slug'
import { metrics } from '@core/metrics'

// Schemas
const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  domain: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional()
})
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().trim().optional(),
  description: z.string().trim().optional()
}).refine((obj: Record<string, unknown>) => Object.keys(obj).length > 0, { message: 'No fields to update' })

export async function GET() {
  const db = getDb()
  // drizzle orderBy(desc(...)) removed to avoid direct drizzle-orm import; using SQL fallback ordering by id desc via manual sort
  const frames = await db.select().from(schema.semanticFrames)
  frames.sort((a, b) => b.id - a.id)
  return success(frames.map(f => ({ ...f, roles: [] })))
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const parsed = await parseJson(req, createSchema)
  if ('error' in parsed) return parsed.error
  const { data: body } = parsed
  const slug = slugify(body.slug || body.name)
  const existing = (await db.select().from(schema.semanticFrames)).find(f => f.slug === slug)
  if (existing) return jsonError('slug already exists', 409)
  const [inserted] = await db.insert(schema.semanticFrames).values({
    name: body.name,
    slug,
    domain: body.domain ?? null,
    description: body.description ?? null
  }).returning()
  metrics.counter('frames_create_total').inc()
  return success({ ...inserted, roles: [] }, 201)
}

export async function PATCH(req: NextRequest) {
  const db = getDb()
  const idParam = new URL(req.url).searchParams.get('id')
  const id = idParam ? Number(idParam) : NaN
  if (!idParam || Number.isNaN(id)) return new Response('id required', { status: 400 })
  const parsed = await parseJson(req, updateSchema)
  if ('error' in parsed) return parsed.error
  const { data: body } = parsed
  const updateValues: Record<string, unknown> = {}
  if (body.name) updateValues.name = body.name
  if (body.domain !== undefined) updateValues.domain = body.domain || null
  if (body.description !== undefined) updateValues.description = body.description || null
  if (body.name) updateValues.slug = slugify(body.name)
  const updated = await db.update(schema.semanticFrames).set(updateValues).where(sql`${schema.semanticFrames.id} = ${id}`).returning()
  if (!updated.length) return jsonError('not found', 404)
  metrics.counter('frames_update_total').inc()
  return success({ ...updated[0], roles: [] })
}

export async function DELETE(req: NextRequest) {
  const db = getDb()
  const idParam = new URL(req.url).searchParams.get('id')
  const id = idParam ? Number(idParam) : NaN
  if (!idParam || Number.isNaN(id)) return jsonError('id required', 400)
  const deleted = await db.delete(schema.semanticFrames).where(sql`${schema.semanticFrames.id} = ${id}`).returning()
  if (!deleted.length) return jsonError('not found', 404)
  metrics.counter('frames_delete_total').inc()
  return new Response(null, { status: 204 })
}