import { NextRequest } from 'next/server'
import { getDb, schema } from '../../../../../packages/db/client'
import { z } from 'zod'
import { parseJson, success, jsonError } from '../_util/respond'
import { slugify } from '../../../lib/utils/slug'
import { metrics } from '@core/metrics'
import { normalizeFrameRoles, type FrameRoleInput } from '@core/semantics/roles'
import { semanticsService, type UpdateFrameInput } from '@core/semantics'

// Schemas
const roleSchema = z.object({
  name: z.string().min(1),
  cardinality: z.string().min(1),
  order: z.number().int().min(0).optional()
})
const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  domain: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  roles: z.array(roleSchema).optional()
})
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().trim().optional(),
  description: z.string().trim().optional(),
  roles: z.array(roleSchema).optional()
}).refine((obj: Record<string, unknown>) => Object.keys(obj).length > 0, { message: 'No fields to update' })

export async function GET() {
  const db = getDb()
  // drizzle orderBy(desc(...)) removed to avoid direct drizzle-orm import; using SQL fallback ordering by id desc via manual sort
  const frames = await db.select().from(schema.semanticFrames)
  frames.sort((a, b) => b.id - a.id)
  return success(frames.map(f => ({
    ...f,
    roles: normalizeFrameRoles(f.roles as FrameRoleInput[] | undefined)
  })))
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const parsed = await parseJson(req, createSchema)
  if ('error' in parsed) return parsed.error
  const { data: body } = parsed
  const slug = slugify(body.slug || body.name)
  const existing = (await db.select().from(schema.semanticFrames)).find(f => f.slug === slug)
  if (existing) return jsonError('slug already exists', 409)
  const roles = normalizeFrameRoles(body.roles as FrameRoleInput[] | undefined)
  const domain = body.domain?.trim() || undefined
  const description = body.description?.trim() || undefined
  const created = await semanticsService.createFrame({
    name: body.name,
    slug,
    domain,
    description,
    roles
  })
  metrics.counter('frames_create_total').inc()
  return success({ ...created, roles: normalizeFrameRoles(created.roles as FrameRoleInput[] | undefined) }, 201)
}

export async function PATCH(req: NextRequest) {
  const db = getDb()
  const idParam = new URL(req.url).searchParams.get('id')
  const id = idParam ? Number(idParam) : NaN
  if (!idParam || Number.isNaN(id)) return new Response('id required', { status: 400 })
  const parsed = await parseJson(req, updateSchema)
  if ('error' in parsed) return parsed.error
  const { data: body } = parsed
  const patch: UpdateFrameInput = {}
  if (body.name) {
    patch.name = body.name
    const newSlug = slugify(body.name)
    const existing = (await db.select().from(schema.semanticFrames)).find(f => f.slug === newSlug && f.id !== id)
    if (existing) return jsonError('slug already exists', 409)
    patch.slug = newSlug
  }
  if (body.domain !== undefined) {
    const trimmed = body.domain.trim()
    patch.domain = trimmed ? trimmed : null
  }
  if (body.description !== undefined) {
    const trimmed = body.description.trim()
    patch.description = trimmed ? trimmed : null
  }
  if (body.roles !== undefined) {
    patch.roles = normalizeFrameRoles(body.roles as FrameRoleInput[] | undefined)
  }

  const updated = await semanticsService.updateFrame(id, patch)
  if (!updated) return jsonError('not found', 404)
  metrics.counter('frames_update_total').inc()
  return success({
    ...updated,
    roles: normalizeFrameRoles(updated.roles as FrameRoleInput[] | undefined)
  })
}

export async function DELETE(req: NextRequest) {
  const idParam = new URL(req.url).searchParams.get('id')
  const id = idParam ? Number(idParam) : NaN
  if (!idParam || Number.isNaN(id)) return jsonError('id required', 400)
  const deleted = await semanticsService.deleteFrame(id)
  if (!deleted) return jsonError('not found', 404)
  metrics.counter('frames_delete_total').inc()
  return new Response(null, { status: 204 })
}