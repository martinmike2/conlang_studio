import { NextRequest } from 'next/server'

// Dev helper: return a mock whoami payload. In a real app integrate with your auth (next-auth/session)
export async function GET(req: NextRequest) {
  // TODO: replace with real auth lookup
  const mock = { id: 'dev-user-1', name: 'Dev User' }
  return new Response(JSON.stringify(mock), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
