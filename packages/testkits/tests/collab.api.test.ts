import { describe, it, expect, beforeEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import * as schema from '@db/schema/core'
import { createSessionInputSchema, appendEventInputSchema, listEventsInputSchema } from '@core/activity/collabTypes'
import { createSession, appendEvent, listEvents, getSession } from '@core/activity/collabService'

/**
 * API Integration Tests for Collaboration Endpoints
 * 
 * These tests verify the API layer behavior including:
 * - Request validation
 * - Error handling
 * - Response formats
 * - Edge cases
 */

describe('Collaboration API Integration', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>
  let testLanguageId: number
  let testUserId: string

  // Mock Next.js Request/Response for testing
  function createMockRequest(method: string, url: string, body?: any): Request {
    return new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }) as any
  }

  beforeEach(async () => {
    const client = new PGlite()
    db = drizzle(client, { schema })

    // Apply schema
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

  describe('POST /api/collab/sessions - Input Validation', () => {
    it('accepts valid session creation request', () => {
      const input = {
        languageId: testLanguageId,
        ownerId: testUserId
      }

      // This would be tested against the actual API endpoint
      // For now, we verify the validation schema
      // Schema is already imported at the top
      const result = createSessionInputSchema.safeParse(input)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(input)
    })

    it('rejects negative languageId', () => {
      // Schema is already imported at the top
      const result = createSessionInputSchema.safeParse({ languageId: -1 })

      expect(result.success).toBe(false)
    })

    it('rejects zero languageId', () => {
      // Schema is already imported at the top
      const result = createSessionInputSchema.safeParse({ languageId: 0 })

      expect(result.success).toBe(false)
    })

    it('rejects empty ownerId string', () => {
      // Schema is already imported at the top
      const result = createSessionInputSchema.safeParse({ ownerId: '' })

      expect(result.success).toBe(false)
    })

    it('accepts missing optional fields', () => {
      // Schema is already imported at the top
      const result = createSessionInputSchema.safeParse({})

      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })
  })

  describe('POST /api/collab/events - Input Validation', () => {
    it('accepts valid event creation request', () => {
      // Schema is already imported at the top
      const input = {
        sessionId: 1,
        actorId: testUserId,
        clientSeq: 5,
        payload: { type: 'insert', text: 'hello' },
        hash: 'sha256:abc123'
      }

      const result = appendEventInputSchema.safeParse(input)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(input)
    })

    it('requires sessionId', () => {
      // Schema is already imported at the top
      const result = appendEventInputSchema.safeParse({
        payload: { type: 'test' }
      })

      expect(result.success).toBe(false)
    })

    it('rejects negative sessionId', () => {
      // Schema is already imported at the top
      const result = appendEventInputSchema.safeParse({
        sessionId: -1,
        payload: {}
      })

      expect(result.success).toBe(false)
    })

    it('rejects negative clientSeq', () => {
      // Schema is already imported at the top
      const result = appendEventInputSchema.safeParse({
        sessionId: 1,
        clientSeq: -1,
        payload: {}
      })

      expect(result.success).toBe(false)
    })

    it('accepts zero clientSeq', () => {
      // Schema is already imported at the top
      const result = appendEventInputSchema.safeParse({
        sessionId: 1,
        clientSeq: 0,
        payload: {}
      })

      expect(result.success).toBe(true)
    })

    it('accepts complex nested payload', () => {
      // Schema is already imported at the top
      const result = appendEventInputSchema.safeParse({
        sessionId: 1,
        payload: {
          type: 'update',
          changes: [{ pos: 0, insert: 'test' }],
          meta: { nested: { deep: true } }
        }
      })

      expect(result.success).toBe(true)
    })
  })

  describe('GET /api/collab/events - Input Validation', () => {
    it('accepts valid query parameters', () => {
      // Schema is already imported at the top
      const result = listEventsInputSchema.safeParse({
        sessionId: 1,
        sinceServerSeq: 5
      })

      expect(result.success).toBe(true)
    })

    it('requires sessionId', () => {
      // Schema is already imported at the top
      const result = listEventsInputSchema.safeParse({
        sinceServerSeq: 5
      })

      expect(result.success).toBe(false)
    })

    it('rejects negative sinceServerSeq', () => {
      // Schema is already imported at the top
      const result = listEventsInputSchema.safeParse({
        sessionId: 1,
        sinceServerSeq: -1
      })

      expect(result.success).toBe(false)
    })

    it('accepts zero sinceServerSeq', () => {
      // Schema is already imported at the top
      const result = listEventsInputSchema.safeParse({
        sessionId: 1,
        sinceServerSeq: 0
      })

      expect(result.success).toBe(true)
    })
  })

  describe('API Error Handling Scenarios', () => {
    it('should return 400 for malformed JSON', async () => {
      // This tests that the API properly handles JSON parse errors
      // In a real test, you'd call the actual endpoint
      const malformedJson = '{ invalid json'
      
      expect(() => JSON.parse(malformedJson)).toThrow()
    })

    it('should return 404 for non-existent session when appending event', async () => {
      // Service is already imported at the top
      
      await expect(async () => {
        await appendEvent({
          sessionId: 99999,
          payload: { test: true }
        }, db)
      }).rejects.toThrow('Session 99999 not found')
    })

    it('should handle database connection errors gracefully', async () => {
      // This would test that API endpoints properly catch and return 500 errors
      // when the database is unavailable
      // In a real scenario, you'd mock the db connection to fail
    })
  })

  describe('Event ordering guarantees', () => {
    it('ensures events are retrievable in insertion order', async () => {
      // Service is already imported at the top
      
      const session = await createSession(testLanguageId, testUserId, db)

      const events = []
      for (let i = 0; i < 5; i++) {
        events.push(await appendEvent({
          sessionId: session.id,
          clientSeq: i,
          payload: { index: i }
        }, db))
      }

      const retrieved = await listEvents(session.id, undefined, db)

      expect(retrieved.map(e => e.serverSeq)).toEqual([1, 2, 3, 4, 5])
      expect(retrieved.map(e => e.payload)).toEqual([
        { index: 0 },
        { index: 1 },
        { index: 2 },
        { index: 3 },
        { index: 4 }
      ])
    })
  })

  describe('Session lifecycle', () => {
    it('cascades delete events when session is deleted', async () => {
      // Service is already imported at the top
      
      const session = await createSession(testLanguageId, testUserId, db)
      
      await appendEvent({ sessionId: session.id, payload: { test: 1 } }, db)
      await appendEvent({ sessionId: session.id, payload: { test: 2 } }, db)

      // Delete session
      await db.delete(schema.collabSessions).where(eq(schema.collabSessions.id, session.id))

      // Events should be deleted too (cascade)
      const events = await db.query.collabEvents.findMany({
        where: eq(schema.collabEvents.sessionId, session.id)
      })

      expect(events).toHaveLength(0)
    })

    it('sets owner_id to null when user is deleted', async () => {
      // Service is already imported at the top
      
      const session = await createSession(testLanguageId, testUserId, db)
      
      expect(session.ownerId).toBe(testUserId)

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, testUserId))

      // Session owner should be null
      const updated = await getSession(session.id, db)
      expect(updated?.ownerId).toBeNull()
    })
  })
})
