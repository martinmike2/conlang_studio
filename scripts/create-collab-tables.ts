#!/usr/bin/env tsx
import { sql } from 'drizzle-orm'
import { db } from '../packages/db/client'

async function main() {
  console.log('[create-collab-tables] Creating collaboration tables...')
  
  try {
    // Create collab_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collab_sessions (
        id serial PRIMARY KEY,
        language_id integer REFERENCES languages(id) ON DELETE CASCADE,
        owner_id text REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        last_active timestamptz
      )
    `)
    console.log('[create-collab-tables] ✓ collab_sessions created')

    // Create collab_events table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collab_events (
        id serial PRIMARY KEY,
        session_id integer NOT NULL REFERENCES collab_sessions(id) ON DELETE CASCADE,
        actor_id text,
        client_seq integer,
        server_seq integer,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now() NOT NULL,
        hash text
      )
    `)
    console.log('[create-collab-tables] ✓ collab_events created')

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_collab_events_session_server_seq 
      ON collab_events(session_id, server_seq)
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_collab_events_session_client_seq 
      ON collab_events(session_id, client_seq)
    `)
    console.log('[create-collab-tables] ✓ indexes created')

    console.log('[create-collab-tables] Success!')
  } catch (err) {
    console.error('[create-collab-tables] Error:', err)
    process.exit(1)
  }
}

main()
