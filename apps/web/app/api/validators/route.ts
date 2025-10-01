import type { NextRequest } from "next/server"
import { validateToneAssociations, validateOrthographyRoundTrip, validatePatternCompleteness } from "@core/validation"
import { getDb } from '../../../../../packages/db/client'

export async function GET(req: NextRequest) {
  if (process.env.FEATURE_VALIDATORS_PANEL !== 'true') {
    return new Response('Not Found', { status: 404 })
  }
  const db = getDb()

  async function safeRun<T>(fn: (db: any) => Promise<T>, id: string, name: string) {
    try {
      return await fn(db)
    } catch (err: any) {
      return {
        id,
        name,
        status: 'fail',
        summary: `Error running validator: ${err?.message ?? String(err)}`,
        error: {
          message: err?.message ?? String(err),
          stack: err?.stack
        }
      }
    }
  }

  const [tone, ortho, patterns] = await Promise.all([
    safeRun(validateToneAssociations, 'phonology.toneAssociation', 'Tone association integrity'),
    safeRun(validateOrthographyRoundTrip, 'orthography.roundTrip', 'Orthography round-trip'),
    safeRun(validatePatternCompleteness, 'morphology.patternCompleteness', 'Pattern completeness')
  ])

  const results = [tone, ortho, patterns]

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "content-type": "application/json" }
  })
}
