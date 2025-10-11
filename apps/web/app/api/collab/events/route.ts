import { NextRequest, NextResponse } from 'next/server'
import { appendEvent, listEvents } from '@core/activity/collabService'
import { appendEventInputSchema, listEventsInputSchema } from '@core/activity/collabTypes'
import { getDb } from '@db/client'

/**
 * POST /api/collab/events - Append a new collaboration event
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const parsed = appendEventInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const event = await appendEvent(parsed.data, db)

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Failed to append event:', error)
    
    // Handle session not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Session not found', message: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to append event', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/collab/events?sessionId=123&sinceServerSeq=5 - List collaboration events
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sessionIdParam = url.searchParams.get('sessionId')
    const sinceServerSeqParam = url.searchParams.get('sinceServerSeq')

    if (!sessionIdParam) {
      return NextResponse.json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      )
    }

    const sessionId = parseInt(sessionIdParam, 10)
    const sinceServerSeq = sinceServerSeqParam ? parseInt(sinceServerSeqParam, 10) : undefined

    const parsed = listEventsInputSchema.safeParse({ sessionId, sinceServerSeq })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const db = getDb()
    const events = await listEvents(parsed.data.sessionId, parsed.data.sinceServerSeq, db)

    return NextResponse.json(events, { status: 200 })
  } catch (error) {
    console.error('Failed to list events:', error)
    return NextResponse.json(
      { error: 'Failed to list events', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
