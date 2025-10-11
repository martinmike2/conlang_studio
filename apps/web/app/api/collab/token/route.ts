import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { auth } from '../../../../lib/auth/nextAuth'

// Simple in-memory token store for demo purposes only (prevents excessive token churn)
const tokenStore = new Map<string, { token: string; expiresAt: number }>()
const TTL_MS = 1000 * 60 * 5 // 5 minutes

function devSecretFallback() {
  return process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV !== 'production' ? 'dev-nextauth-secret' : undefined)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const room = url.searchParams.get('room') || 'default'

  // Only allow authenticated sessions to request tokens in production-ish flows
  // Use next-auth helper to get session info if available
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    // ignore — in some test/dev contexts auth() may not be available
  }

  const now = Date.now()
  const existing = tokenStore.get(room)
  if (existing && existing.expiresAt > now) {
    return new Response(JSON.stringify({ token: existing.token }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const secret = devSecretFallback()
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Server misconfigured: NEXTAUTH_SECRET missing' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  // Build minimal claims: subject = user id (if available), room, issuedAt, expires
  const payload: Record<string, any> = {
    room,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + TTL_MS) / 1000)
  }
  if (session?.user?.id) payload.sub = String(session.user.id)

  const token = jwt.sign(payload, secret)
  tokenStore.set(room, { token, expiresAt: now + TTL_MS })
  return new Response(JSON.stringify({ token }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
