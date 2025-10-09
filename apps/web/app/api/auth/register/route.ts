import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getDb, schema } from '../../../../../../packages/db/client'
import { parseJson, success, jsonError } from '../../_util/respond'
import { eq } from 'drizzle-orm'
import { hash } from 'bcryptjs'

const registerSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email('valid email required'),
  password: z.string().min(8, 'password must be at least 8 characters')
})

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, registerSchema)
  if ('error' in parsed) return parsed.error
  const db = getDb()
  const { name, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1)
  if (existing) {
    return jsonError('Email already registered', 409)
  }

  const hashedPassword = await hash(password, 12)
  const userId = crypto.randomUUID()

  const [created] = await db
    .insert(schema.users)
    .values({
      id: userId,
      name,
      email: normalizedEmail,
      hashedPassword
    })
    .returning({ id: schema.users.id, email: schema.users.email })

  return success({ id: created.id, email: created.email }, 201)
}
