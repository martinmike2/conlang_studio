import { NextRequest } from 'next/server'
import { success, jsonError, parseJson } from '../../_util/respond'
import { z } from 'zod'

const schema = z.object({ surface: z.string(), languageId: z.number().optional() })

export async function POST(req: NextRequest) {
  const jsonResult = await parseJson(req, schema)
  if ('error' in jsonResult) return jsonResult.error

  try {
    const mod = await import('@core/morphology/service')
  // type-only rest param name triggers no-unused-vars; disable for this line
  // eslint-disable-next-line no-unused-vars
  const svc = (mod as unknown as { morphologyService: { classifyIntegration: (..._args: unknown[]) => Promise<unknown> } }).morphologyService
    const candidates = await svc.classifyIntegration(jsonResult.data.surface)
    return success(candidates)
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e)
    return jsonError('Service unavailable: ' + msg, 503)
  }
}
