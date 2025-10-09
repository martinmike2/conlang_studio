import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, parseJson, success } from '../../_util/respond'
import { getDb } from '../../../../../../packages/db/client'
import { evaluatePolicyById, StyleSampleSchema, type StyleSample } from '@core/register'

const AuditRequestSchema = z.object({
  policyId: z.number().int().positive(),
  samples: z.array(StyleSampleSchema).min(1)
})

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, AuditRequestSchema)
  if ('error' in parsed) return parsed.error

  try {
  const evaluation = await evaluatePolicyById(parsed.data.policyId, parsed.data.samples as StyleSample[], getDb())
    if (!evaluation) {
      return jsonError('Style policy not found', 404)
    }
    return success(evaluation)
  } catch (e) {
    const message = (e as Error)?.message ?? 'Failed to evaluate style policy'
    return jsonError(message, 500)
  }
}
