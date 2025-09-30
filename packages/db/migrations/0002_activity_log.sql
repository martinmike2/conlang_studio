CREATE TABLE IF NOT EXISTS activity_log (
    id serial PRIMARY KEY,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    scope text NOT NULL,
    entity text,
    action text NOT NULL,
    summary text NOT NULL,
    actor text,
    frame_id integer REFERENCES semantic_frames(id) ON DELETE SET NULL,
    sense_id integer REFERENCES lexeme_senses(id) ON DELETE SET NULL,
    idiom_id integer REFERENCES idioms(id) ON DELETE SET NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS activity_log_occurred_at_idx ON activity_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_scope_idx ON activity_log (scope);
