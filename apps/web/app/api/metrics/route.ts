import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, parseJson, success } from '../_util/respond'
import { getDb } from '../../../../../packages/db/client'
import {
  computeMetrics,
  getLatestSnapshot,
  getSnapshotHistory,
  listRecentMetricsJobs,
  triggerMetricsCollection
} from '@core/metrics'

const TriggerSchema = z.object({
  languageId: z.number().int().positive().optional(),
  debounceMs: z.number().int().min(0).max(60 * 60 * 1000).optional(),
  force: z.boolean().optional(),
  versionRef: z.string().max(128).optional()
})

const DEFAULT_LANGUAGE_ID = 1

function parseLanguageId(url: URL): number | { error: Response } {
  const param = url.searchParams.get('languageId')
  if (!param) return DEFAULT_LANGUAGE_ID
  const parsed = Number(param)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return { error: jsonError('Invalid languageId parameter', 400) }
  }
  return parsed
}

export async function GET(req: NextRequest) {
  const langResult = parseLanguageId(new URL(req.url))
  if (typeof langResult !== 'number') {
    return langResult.error
  }

  const languageId = langResult

  try {
    const db = getDb()
    const [snapshot, history, jobs] = await Promise.all([
      getLatestSnapshot(languageId, db),
      getSnapshotHistory(languageId, 10, db),
      listRecentMetricsJobs(languageId, 5, db)
    ])

    const metrics = snapshot?.metrics ?? (await computeMetrics(languageId, db))

    return success({
      languageId,
      metrics,
      snapshot,
      history,
      jobs
    })
  } catch (error) {
    return jsonError((error as Error)?.message ?? 'Failed to load metrics', 500)
  }
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, TriggerSchema)
  if ('error' in parsed) return parsed.error

  const { languageId = DEFAULT_LANGUAGE_ID, debounceMs, force, versionRef } = parsed.data

  try {
    const db = getDb()
    const result = await triggerMetricsCollection(
      languageId,
      {
        debounceMs,
        force,
        versionRef: versionRef ?? null
      },
      db
    )

    return success(result, result.snapshot ? 201 : 202)
  } catch (error) {
    return jsonError((error as Error)?.message ?? 'Failed to trigger metrics job', 500)
  }
}
