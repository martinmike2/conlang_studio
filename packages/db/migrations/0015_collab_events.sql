-- Migration: add collaboration session and events tables
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
