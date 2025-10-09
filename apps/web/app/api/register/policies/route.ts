import { NextRequest } from 'next/server'
import { jsonError, success } from '../../_util/respond'
import { getDb } from '../../../../../../packages/db/client'
import { listStylePolicies } from '@core/register'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const languageParam = url.searchParams.get('languageId')
    const languageId = languageParam ? Number(languageParam) : undefined
    if (languageParam && Number.isNaN(languageId)) {
      return jsonError('Invalid languageId parameter', 400)
    }
    const policies = await listStylePolicies({ db: getDb(), languageId })
    return success(policies)
  } catch (e) {
    const message = (e as Error)?.message ?? 'Failed to load style policies'
    return jsonError(message, 500)
  }
}
