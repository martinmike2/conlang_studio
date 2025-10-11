import { NextRequest, NextResponse } from 'next/server'
import { createSession, listSessions } from '@core/activity/collabService'
import { createSessionInputSchema } from '@core/activity/collabTypes'
import { getDb } from '@db/client'

/**
 * POST /api/collab/sessions - Create a new collaboration session
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const parsed = createSessionInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const session = await createSession(
      parsed.data.languageId,
      parsed.data.ownerId,
      db
    )

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json(
      { error: 'Failed to create session', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/collab/sessions?languageId=123 - List collaboration sessions
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const languageIdParam = url.searchParams.get('languageId')
    const languageId = languageIdParam ? parseInt(languageIdParam, 10) : undefined

    if (languageIdParam && isNaN(languageId!)) {
      return NextResponse.json(
        { error: 'Invalid languageId parameter' },
        { status: 400 }
      )
    }

    const db = getDb()
    const sessions = await listSessions(languageId, db)

    return NextResponse.json(sessions, { status: 200 })
  } catch (error) {
    console.error('Failed to list sessions:', error)
    return NextResponse.json(
      { error: 'Failed to list sessions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
