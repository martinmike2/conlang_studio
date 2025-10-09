import { NextRequest } from 'next/server'
import { z } from 'zod'
import { parseJson, success, jsonError } from '../../_util/respond'

const createSchema = z.object({
  contactEventId: z.number(),
  candidateRootId: z.number().optional(),
  candidatePatternId: z.number().optional(),
  reason: z.string().optional(),
  meta: z.record(z.any()).optional()
})

export async function POST(req: NextRequest) {
  const jsonResult = await parseJson(req, createSchema)
  if ('error' in jsonResult) return jsonResult.error

  try {
    const mod = await import('@core/loanFlags/service')
    const svc = mod.createLoanFlagsService()
    const created = await svc.createLoanFlag(jsonResult.data)
    return success(created, 201)
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e)
    return jsonError('Service unavailable: ' + msg, 503)
  }
}

const acceptSchema = z.object({ flagId: z.number(), actor: z.string().optional() })
export async function PUT(req: NextRequest) {
  const jsonResult = await parseJson(req, acceptSchema)
  if ('error' in jsonResult) return jsonResult.error

  try {
    const mod = await import('@core/loanFlags/service')
    const svc = mod.createLoanFlagsService()
    const updated = await svc.acceptLoanFlag(jsonResult.data.flagId, jsonResult.data.actor)
    if (!updated) return jsonError('Not found', 404)
    return success(updated)
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e)
    return jsonError('Service unavailable: ' + msg, 503)
  }
}

export async function GET(req: NextRequest) {
  try {
    const mod = await import('@core/loanFlags/service')
    const svc = mod.createLoanFlagsService()
    const url = new URL(req.url)
    const contactEventId = url.searchParams.get('contactEventId')
    const filter = contactEventId ? { contactEventId: Number(contactEventId) } : undefined
    const rows = await svc.listLoanFlags(filter)
    return success(rows)
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e)
    return jsonError('Service unavailable: ' + msg, 503)
  }
}
