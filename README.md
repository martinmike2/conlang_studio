# Conlang Studio Monorepo

## Database Migrations

We use Drizzle with raw SQL migrations stored in `packages/db/migrations`.

Common commands (run from repo root):

```bash
pnpm migrate:check           # Show pending migrations
pnpm migrate:migrate         # Apply migrations (idempotent)
pnpm migrate:verify-rollback # CI safety: transactional apply + rollback
```

Environment variables (see `.env.example`):

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=app
DB_PASSWORD=dev
DB_NAME=conlang_studio
```

## First-Time Setup
1. Create the database: `createdb conlang_studio` (or via your admin tool)
2. Run `pnpm migrate:migrate`
3. Start web app: `pnpm dev`

## Frames API
`/api/frames` currently supports:
- `GET` list frames
- `POST` create new frame (body: `{ "name": "Motion" }`)

## Next Steps
- Add PATCH/DELETE for frames
- Introduce input validation (zod)
- Add tests around migrations & API contracts
