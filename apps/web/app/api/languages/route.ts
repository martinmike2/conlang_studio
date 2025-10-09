import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getDb, schema } from '../../../../../packages/db/client'
import { eq, asc } from 'drizzle-orm'
import { auth } from '../../../lib/auth/nextAuth'
import { parseJson, success, jsonError } from '../_util/respond'
import { slugify } from '../../../lib/utils/slug'

const createLanguageSchema = z.object({
  name: z.string().min(1, 'name is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must contain only lowercase letters, numbers, or hyphens').optional()
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }
  const db = getDb()
  const rows = await db
    .select({
      id: schema.languages.id,
      name: schema.languages.name,
      slug: schema.languages.slug,
      createdAt: schema.languages.createdAt,
      role: schema.userLanguages.role
    })
    .from(schema.userLanguages)
    .innerJoin(schema.languages, eq(schema.userLanguages.languageId, schema.languages.id))
    .where(eq(schema.userLanguages.userId, session.user.id))
  .orderBy(asc(schema.languages.name))
  return success(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }
  const parsed = await parseJson(req, createLanguageSchema)
  if ('error' in parsed) return parsed.error
  const db = getDb()
  const name = parsed.data.name.trim()
  if (!name) {
    return jsonError('name is required', 400)
  }
  const rawSlug = parsed.data.slug ?? name
  let slug = slugify(rawSlug)
  if (!slug) {
    return jsonError('slug cannot be empty', 400)
  }

  // ensure slug is unique by appending incrementing suffix on collision
  const existing = await db.select({ slug: schema.languages.slug }).from(schema.languages).where(eq(schema.languages.slug, slug)).limit(1)
  if (existing.length > 0) {
    const base = slug
    let suffix = 2
    while (true) {
      const candidate = `${base}-${suffix}`
      const conflict = await db.select({ slug: schema.languages.slug }).from(schema.languages).where(eq(schema.languages.slug, candidate)).limit(1)
      if (conflict.length === 0) {
        slug = candidate
        break
      }
      suffix += 1
    }
  }

  const [language] = await db
    .insert(schema.languages)
  .values({ name, slug })
    .returning({ id: schema.languages.id, name: schema.languages.name, slug: schema.languages.slug, createdAt: schema.languages.createdAt })

  await db
    .insert(schema.userLanguages)
    .values({ userId: session.user.id, languageId: language.id, role: 'owner' })

  return success({ ...language, role: 'owner' }, 201)
}
