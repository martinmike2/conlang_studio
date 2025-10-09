// NextRequest import intentionally omitted; this API doesn't use the request object
import { validateToneAssociations, validateOrthographyRoundTrip, validatePatternCompleteness } from "@core/validation"
import { getDb } from '../../../../../packages/db/client'

export async function GET() {
  if (process.env.FEATURE_VALIDATORS_PANEL !== 'true') {
    return new Response('Not Found', { status: 404 })
  }
  const _db = getDb()

  // Accept validator functions with either (db) or (db, opts).
  async function safeRun(fn: unknown, id: string, name: string) {
    try {
      // Validators have differing signatures: some expect (db), others (db, opts).
      // Detect arity at runtime and call accordingly.
      if (typeof fn === 'function') {
        // Infer arity at runtime and call. Use a local `any` binding for the
        // actual invocation so TypeScript typing doesn't obstruct the runtime
        // behavior.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fAny = fn as any
        const arity = fAny.length ?? 0
        if (arity >= 2) {
          return await fAny(_db, {})
        }
        return await fAny(_db)
      }
      throw new Error('Validator is not a function')
    } catch (err: unknown) {
      let message = String(err)
      let stack: string | undefined
      if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>
        if (typeof e.message === 'string') message = e.message
        if (typeof e.stack === 'string') stack = e.stack
      }
      return {
        id,
        name,
        status: 'fail',
        summary: `Error running validator: ${message}`,
        error: {
          message,
          stack
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
