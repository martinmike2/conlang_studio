import { NextRequest } from 'next/server'
import { getDb, schema } from '../../../../../packages/db/client'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { parseJson, success, jsonError } from '../_util/respond'
import { metrics } from '@core/metrics'

const createSchema = z.object({
	frameId: z.number().int().positive(),
	gloss: z.string().min(1),
	definition: z.string().optional()
})

export async function POST(req: NextRequest) {
	const db = getDb()
	const parsed = await parseJson(req, createSchema)
	if ('error' in parsed) return parsed.error
	const { data } = parsed

	const [frame] = await db
		.select({ id: schema.semanticFrames.id })
		.from(schema.semanticFrames)
		.where(eq(schema.semanticFrames.id, data.frameId))
		.limit(1)

	if (!frame?.id) {
		return jsonError('frame not found', 404)
	}

	const [inserted] = await db
		.insert(schema.lexemeSenses)
		.values({
			frameId: data.frameId,
			gloss: data.gloss,
			definition: data.definition ?? null
		})
		.returning()

	metrics.counter('senses_create_total').inc()
	return success(inserted, 201)
}