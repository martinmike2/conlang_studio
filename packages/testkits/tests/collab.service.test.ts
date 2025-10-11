import { describe, it, expect, beforeEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '@db/schema/core'
import { createSession, appendEvent, listEvents, getSession, updateSessionActivity, listSessions } from '@core/activity/collabService'
import { sql } from 'drizzle-orm'

describe('Collaboration Service Integration Tests', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>
  let testLanguageId: number
  let testUserId: string

  beforeEach(async () => {
    // Create in-memory database
    const client = new PGlite()
    db = drizzle(client, { schema })

    // Apply schema migrations (simplified for test)
    await client.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        name text,
        email text NOT NULL UNIQUE,
        email_verified timestamptz,
        image text,
        hashed_password text,
        created_at timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS languages (
        id serial PRIMARY KEY,
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        created_at timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collab_sessions (
        id serial PRIMARY KEY,
        language_id integer REFERENCES languages(id) ON DELETE CASCADE,
        owner_id text REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        last_active timestamptz
      );

      CREATE TABLE IF NOT EXISTS collab_events (
        id serial PRIMARY KEY,
        session_id integer NOT NULL REFERENCES collab_sessions(id) ON DELETE CASCADE,
        actor_id text,
        client_seq integer,
        server_seq integer,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now() NOT NULL,
        hash text
      );

      CREATE INDEX IF NOT EXISTS idx_collab_events_session_server_seq ON collab_events(session_id, server_seq);
      CREATE INDEX IF NOT EXISTS idx_collab_events_session_client_seq ON collab_events(session_id, client_seq);
    `)

    // Seed test data
    const [user] = await db.insert(schema.users).values({
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@example.com',
      hashedPassword: 'hashed'
    }).returning()
    testUserId = user.id

    const [language] = await db.insert(schema.languages).values({
      name: 'Test Language',
      slug: 'test-language'
    }).returning()
    testLanguageId = language.id
  })

  describe('createSession', () => {
    it('creates a session with language and owner', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      expect(session).toBeDefined()
      expect(session.id).toBeGreaterThan(0)
      expect(session.languageId).toBe(testLanguageId)
      expect(session.ownerId).toBe(testUserId)
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.lastActive).toBeInstanceOf(Date)
    })

    it('creates a session without language or owner', async () => {
      const session = await createSession(undefined, undefined, db)

      expect(session).toBeDefined()
      expect(session.id).toBeGreaterThan(0)
      expect(session.languageId).toBeNull()
      expect(session.ownerId).toBeNull()
    })
  })

  describe('getSession', () => {
    it('retrieves an existing session', async () => {
      const created = await createSession(testLanguageId, testUserId, db)
      const retrieved = await getSession(created.id, db)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.languageId).toBe(testLanguageId)
    })

    it('returns null for non-existent session', async () => {
      const retrieved = await getSession(99999, db)
      expect(retrieved).toBeNull()
    })
  })

  describe('listSessions', () => {
    it('lists all sessions', async () => {
      await createSession(testLanguageId, testUserId, db)
      await createSession(testLanguageId, testUserId, db)

      const sessions = await listSessions(undefined, db)
      expect(sessions.length).toBeGreaterThanOrEqual(2)
    })

    it('filters sessions by language', async () => {
      const [lang2] = await db.insert(schema.languages).values({ name: 'Lang2', slug: 'lang2' }).returning()
      
      await createSession(testLanguageId, testUserId, db)
      await createSession(lang2.id, testUserId, db)

      const sessions = await listSessions(testLanguageId, db)
      expect(sessions.every(s => s.languageId === testLanguageId)).toBe(true)
    })

    it('orders sessions by last_active descending', async () => {
      const s1 = await createSession(testLanguageId, testUserId, db)
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const s2 = await createSession(testLanguageId, testUserId, db)

      const sessions = await listSessions(testLanguageId, db)
      expect(sessions[0].id).toBe(s2.id) // Most recent first
      expect(sessions[1].id).toBe(s1.id)
    })
  })

  describe('appendEvent', () => {
    it('appends event with auto-incremented server_seq', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      const event = await appendEvent({
        sessionId: session.id,
        actorId: testUserId,
        clientSeq: 1,
        payload: { type: 'insert', text: 'hello' }
      }, db)

      expect(event).toBeDefined()
      expect(event.id).toBeGreaterThan(0)
      expect(event.sessionId).toBe(session.id)
      expect(event.actorId).toBe(testUserId)
      expect(event.clientSeq).toBe(1)
      expect(event.serverSeq).toBe(1) // First event
      expect(event.payload).toEqual({ type: 'insert', text: 'hello' })
    })

    it('increments server_seq for multiple events', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      const e1 = await appendEvent({
        sessionId: session.id,
        actorId: testUserId,
        clientSeq: 1,
        payload: { type: 'insert', text: 'a' }
      }, db)

      const e2 = await appendEvent({
        sessionId: session.id,
        actorId: testUserId,
        clientSeq: 2,
        payload: { type: 'insert', text: 'b' }
      }, db)

      expect(e1.serverSeq).toBe(1)
      expect(e2.serverSeq).toBe(2)
    })

    it('updates session last_active timestamp', async () => {
      const session = await createSession(testLanguageId, testUserId, db)
      const initialLastActive = session.lastActive

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      await appendEvent({
        sessionId: session.id,
        payload: { type: 'test' }
      }, db)

      const updated = await getSession(session.id, db)
      expect(updated?.lastActive).not.toEqual(initialLastActive)
      expect(updated?.lastActive!.getTime()).toBeGreaterThan(initialLastActive!.getTime())
    })

    it('throws error for non-existent session', async () => {
      await expect(async () => {
        await appendEvent({
          sessionId: 99999,
          payload: { type: 'test' }
        }, db)
      }).rejects.toThrow('Session 99999 not found')
    })

    it('handles events with hash', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      const event = await appendEvent({
        sessionId: session.id,
        actorId: testUserId,
        payload: { type: 'insert' },
        hash: 'sha256:abc123'
      }, db)

      expect(event.hash).toBe('sha256:abc123')
    })
  })

  describe('listEvents', () => {
    it('lists all events for a session in order', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      await appendEvent({ sessionId: session.id, payload: { seq: 1 } }, db)
      await appendEvent({ sessionId: session.id, payload: { seq: 2 } }, db)
      await appendEvent({ sessionId: session.id, payload: { seq: 3 } }, db)

      const events = await listEvents(session.id, undefined, db)

      expect(events).toHaveLength(3)
      expect(events[0].serverSeq).toBe(1)
      expect(events[1].serverSeq).toBe(2)
      expect(events[2].serverSeq).toBe(3)
    })

    it('filters events by sinceServerSeq', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      await appendEvent({ sessionId: session.id, payload: { seq: 1 } }, db)
      await appendEvent({ sessionId: session.id, payload: { seq: 2 } }, db)
      await appendEvent({ sessionId: session.id, payload: { seq: 3 } }, db)

      const events = await listEvents(session.id, 1, db)

      expect(events).toHaveLength(2)
      expect(events[0].serverSeq).toBe(2)
      expect(events[1].serverSeq).toBe(3)
    })

    it('returns empty array for session with no events', async () => {
      const session = await createSession(testLanguageId, testUserId, db)
      const events = await listEvents(session.id, undefined, db)

      expect(events).toHaveLength(0)
    })

    it('isolates events by session', async () => {
      const s1 = await createSession(testLanguageId, testUserId, db)
      const s2 = await createSession(testLanguageId, testUserId, db)

      await appendEvent({ sessionId: s1.id, payload: { session: 1 } }, db)
      await appendEvent({ sessionId: s2.id, payload: { session: 2 } }, db)

      const events1 = await listEvents(s1.id, undefined, db)
      const events2 = await listEvents(s2.id, undefined, db)

      expect(events1).toHaveLength(1)
      expect(events2).toHaveLength(1)
      expect(events1[0].payload).toEqual({ session: 1 })
      expect(events2[0].payload).toEqual({ session: 2 })
    })
  })

  describe('updateSessionActivity', () => {
    it('updates last_active timestamp', async () => {
      const session = await createSession(testLanguageId, testUserId, db)
      const initialLastActive = session.lastActive

      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await updateSessionActivity(session.id, db)

      expect(updated).toBeDefined()
      expect(updated?.lastActive).not.toEqual(initialLastActive)
      expect(updated?.lastActive!.getTime()).toBeGreaterThan(initialLastActive!.getTime())
    })

    it('returns null for non-existent session', async () => {
      const result = await updateSessionActivity(99999, db)
      expect(result).toBeNull()
    })
  })

  describe('Concurrency and event ordering', () => {
    it('maintains correct server_seq under concurrent appends', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      // Simulate concurrent event appends
      const promises = Array.from({ length: 10 }, (_, i) =>
        appendEvent({
          sessionId: session.id,
          actorId: testUserId,
          clientSeq: i + 1,
          payload: { index: i }
        }, db)
      )

      const events = await Promise.all(promises)

      // All events should have unique server_seq values
      const serverSeqs = events.map(e => e.serverSeq).sort((a, b) => a - b)
      expect(serverSeqs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })
  })

  describe('Edge cases', () => {
    it('handles events with empty payload', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      const event = await appendEvent({
        sessionId: session.id,
        payload: {}
      }, db)

      expect(event.payload).toEqual({})
    })

    it('handles events with complex nested payload', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      const complexPayload = {
        type: 'update',
        changes: [
          { pos: 0, insert: 'hello' },
          { pos: 5, delete: 2 }
        ],
        metadata: {
          timestamp: Date.now(),
          nested: { deep: { value: 42 } }
        }
      }

      const event = await appendEvent({
        sessionId: session.id,
        payload: complexPayload
      }, db)

      expect(event.payload).toEqual(complexPayload)
    })

    it('handles null optional fields gracefully', async () => {
      const session = await createSession(testLanguageId, testUserId, db)

      const event = await appendEvent({
        sessionId: session.id,
        actorId: undefined,
        clientSeq: undefined,
        hash: undefined,
        payload: { test: true }
      }, db)

      expect(event.actorId).toBeNull()
      expect(event.clientSeq).toBeNull()
      expect(event.hash).toBeNull()
      expect(event.payload).toEqual({ test: true })
    })
  })
})
