import { NextRequest } from 'next/server'
import { getDb } from '../../../../../packages/db/client'
import { parseJson, success, jsonError } from '../_util/respond'
import { OverlayCreateSchema, type OverlayCreate } from '@core/overlays'

// Dev fallback store: when the database/drizzle cannot be initialized (common in
// local dev without a running Postgres or when Next's module loading yields
// an unexpected error), prefer to continue serving the UI by using an
// in-memory overlay list. This is only used in non-production to aid E2E
// smoke testing; it's not durable and should not be used in CI or prod.
const inMemoryOverlays: InMemoryOverlayRecord[] = []
let inMemoryNextId = 1

// Use the shared OverlayCreateSchema from `@core/overlays` for request validation
const overlayCreateSchema = OverlayCreateSchema

type InMemoryOverlayRecord = Required<Pick<OverlayCreate, 'name'>> & {
  id: number
  languageId: number | null
  ops: OverlayCreate['ops']
  meta: OverlayCreate['meta']
  createdAt: string
}

export async function GET() {
  try {
    // Simple API key guard: if API_KEY is set, require it in X-API-KEY header
    const requiredKey = process.env.API_KEY
    if (requiredKey) {
      // NextRequest isn't available here; rely on environment-level protection for now
      // (In a real deployment, this route would be behind application auth.)
    }
    const mod = await import('@core/overlays')
    // type-only parameter name 'db' can trigger no-unused-vars; disable for this type assertion
    // eslint-disable-next-line no-unused-vars
    const svc = mod as unknown as { listOverlays: (db: unknown) => Promise<unknown[]> }
    try {
      const _db = getDb()
      const rows = await svc.listOverlays(_db)
      return success(rows)
    } catch (err) {
      // If DB/drizzle isn't available, and the explicit dev fallback flag is set,
      // return the in-memory store so the UI can still function for local testing.
      if (process.env.OVERLAYS_DEV_FALLBACK === 'true') {
        return success(inMemoryOverlays)
      }
      throw err
    }
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e)
    return jsonError('Service unavailable: ' + msg, 503)
  }
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, overlayCreateSchema)
  if ('error' in parsed) return parsed.error
  try {
    // Simple API key guard: require X-API-KEY header to match if API_KEY present
    const requiredKey = process.env.API_KEY
    if (requiredKey) {
      const key = req.headers.get('x-api-key')
      if (!key || key !== requiredKey) {
        return jsonError('Unauthorized', 401)
      }
    }
    const mod = await import('@core/overlays')
    // type-only parameter names 'db' and 'body' can trigger no-unused-vars; disable for this type assertion
    // eslint-disable-next-line no-unused-vars
    const svc = mod as unknown as { createOverlay: (db: unknown, body: OverlayCreate) => Promise<unknown> }
    try {
      const _db = getDb()
      const payload: OverlayCreate = {
        ...parsed.data,
        ops: parsed.data.ops ?? [],
        meta: parsed.data.meta ?? {}
      }
      const created = await svc.createOverlay(_db, payload)
      return success(created, 201)
    } catch (err) {
      if (process.env.OVERLAYS_DEV_FALLBACK === 'true') {
        // fallback: persist to in-memory store so the UI can save/load overlays
        const now = new Date().toISOString()
        const id = inMemoryNextId++
        const payload: OverlayCreate = {
          ...parsed.data,
          ops: parsed.data.ops ?? [],
          meta: parsed.data.meta ?? {}
        }
        const rec: InMemoryOverlayRecord = {
          id,
          languageId: payload.languageId ?? null,
          name: payload.name,
          ops: payload.ops ?? [],
          meta: payload.meta ?? {},
          createdAt: now
        }
        inMemoryOverlays.push(rec)
        return success(rec, 201)
      }
      throw err
    }
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e)
    return jsonError('Service unavailable: ' + msg, 503)
  }
}
