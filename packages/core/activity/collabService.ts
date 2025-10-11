import { getDb } from '../../db/client'
import { collabEvents, collabSessions } from '../../db/schema/core'
import type { InferInsertModel } from 'drizzle-orm'
import { eq, gt, and, desc } from 'drizzle-orm'

type Db = ReturnType<typeof getDb>

export interface CollabEventInput {
  sessionId: number
  actorId?: string | null
  clientSeq?: number | null
  payload?: Record<string, unknown>
  hash?: string | null
}

export async function appendEvent(input: CollabEventInput, db: Db = getDb()) {
  // Use a transaction to ensure atomic server_seq increment
  return await db.transaction(async (tx) => {
    // Validate session exists
    const [session] = await tx.select().from(collabSessions).where(eq(collabSessions.id, input.sessionId))
    
    if (!session) {
      throw new Error(`Session ${input.sessionId} not found`)
    }

    // Get next server sequence number for this session with row lock
    // This ensures concurrent transactions will wait for each other
    const [lastEvent] = await tx.select().from(collabEvents)
      .where(eq(collabEvents.sessionId, input.sessionId))
      .orderBy(desc(collabEvents.serverSeq))
      .limit(1)
    
    const nextServerSeq = (lastEvent?.serverSeq ?? 0) + 1

    const insert: InferInsertModel<typeof collabEvents> = {
      sessionId: input.sessionId,
      actorId: input.actorId ?? null,
      clientSeq: input.clientSeq ?? null,
      serverSeq: nextServerSeq,
      payload: input.payload ?? {},
      hash: input.hash ?? null
    }
    
    const [row] = await tx.insert(collabEvents).values(insert).returning()
    
    // Update session last_active timestamp
    await tx.update(collabSessions)
      .set({ lastActive: new Date() })
      .where(eq(collabSessions.id, input.sessionId))
    
    return row
  })
}

export async function listEvents(sessionId: number, sinceServerSeq?: number, db: Db = getDb()) {
  const conditions = []
  conditions.push(eq(collabEvents.sessionId, sessionId))
  if (typeof sinceServerSeq === 'number') {
    conditions.push(gt(collabEvents.serverSeq, sinceServerSeq))
  }

  let query = db.select().from(collabEvents).$dynamic()
  if (conditions.length === 1) query = query.where(conditions[0])
  else if (conditions.length > 1) query = query.where(and(...conditions))

  const rows = await query.orderBy(collabEvents.serverSeq)
  return rows
}

export async function createSession(languageId?: number, ownerId?: string | null, db: Db = getDb()) {
  const insert: InferInsertModel<typeof collabSessions> = { 
    languageId: languageId ?? null, 
    ownerId: ownerId ?? null,
    lastActive: new Date()
  }
  const [row] = await db.insert(collabSessions).values(insert).returning()
  return row
}

export async function getSession(sessionId: number, db: Db = getDb()) {
  const [session] = await db.select().from(collabSessions).where(eq(collabSessions.id, sessionId))
  return session ?? null
}

export async function updateSessionActivity(sessionId: number, db: Db = getDb()) {
  const [row] = await db.update(collabSessions)
    .set({ lastActive: new Date() })
    .where(eq(collabSessions.id, sessionId))
    .returning()
  return row ?? null
}

export async function listSessions(languageId?: number, db: Db = getDb()) {
  if (languageId !== undefined) {
    return db.select().from(collabSessions)
      .where(eq(collabSessions.languageId, languageId))
      .orderBy(desc(collabSessions.lastActive))
  }
  return db.select().from(collabSessions).orderBy(desc(collabSessions.lastActive))
}
