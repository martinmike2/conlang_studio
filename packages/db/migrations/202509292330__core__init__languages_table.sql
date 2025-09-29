-- Phase 0 initial core migration: languages table
CREATE TABLE IF NOT EXISTS languages (
    id serial PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    created_at timestamp NOT NULL DEFAULT now()
);
