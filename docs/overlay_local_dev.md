# Local dev: Variant Overlays with Postgres

This short guide explains how to run a local Postgres for the web app so overlays persist into a real database instead of the in-memory fallback.

Prerequisites:
- Docker & Docker Compose installed
- pnpm installed

1) Start Postgres via Docker Compose

```bash
docker compose up -d
```

This starts a Postgres 15 container listening on localhost:5432 with the default credentials configured in `docker-compose.yml` (user `app`, password `dev`, db `conlang_studio`).

2) Export DB env vars for the web process

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=app
export DB_PASSWORD=dev
export DB_NAME=conlang_studio
```

3) Run the DB migrations

The project stores SQL migrations under `packages/db/migrations/`.

- If you have a migration runner script (check `packages/db/scripts`), run it. Example:

```bash
pnpm --filter db run --silent node packages/db/scripts/migrations-run-commit.js || echo "Run your migration runner here"
```

Or apply the minimal overlay table migration manually (example):

```sql
CREATE TABLE IF NOT EXISTS variant_overlays (
  id serial PRIMARY KEY,
  language_id integer,
  name text NOT NULL,
  ops jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

4) Start the web dev server

```bash
pnpm --filter web dev
```

5) Smoke test the overlay API

```bash
curl -sS -X GET http://localhost:3000/api/overlays | jq '.'

curl -sS -X POST http://localhost:3000/api/overlays \
  -H 'Content-Type: application/json' \
  -d '{"name":"demo","ops":[{"action":"add","pattern":"x","replacement":"y","priority":1}]}' | jq '.'
```

Notes:
- The repository includes a small in-memory fallback in `apps/web/app/api/overlays/route.ts` that is only used when the DB cannot be reached and `NODE_ENV !== 'production'`. This is convenient for quick UI checks but not durable.
- If you want me to add a specific `pnpm` script to run migrations or to wire `docker compose` into a dev helper, tell me and I'll add it.
