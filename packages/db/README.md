## DB Package

Adopted Option C: migrations will now be generated via drizzle-kit instead of maintained raw SQL files.

Current state:
- All prior manual SQL migration files removed
- Journal reset (empty)
- After you drop existing tables in the target database, run generation:

```bash
pnpm migrate:generate
```

If schema matches `packages/db/schema/*`, drizzle-kit will produce a new timestamped migration in `migrations/`.
Then apply:

```bash
pnpm migrate:migrate
```

If you need a clean slate: ensure the database has no leftover tables (drop or recreate the database) before applying the first generated migration.

Going forward:
1. Modify schema in `schema/core.ts`.
2. Run `pnpm migrate:generate` to create a migration.
3. Run `pnpm migrate:migrate` to apply it.
4. Commit the generated migration file + updated journal.

Manual bootstrap script still exists but should not be used in the generated migration workflow.