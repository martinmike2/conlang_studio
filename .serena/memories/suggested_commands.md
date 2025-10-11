# Suggested Commands for Conlang Studio

## Development Commands (from repo root)

### Core Development
```bash
pnpm dev                    # Start all dev servers (uses Turbo)
pnpm build                  # Build all packages and apps
pnpm lint                   # Run ESLint across all packages
pnpm typecheck              # Run TypeScript type checking
pnpm test                   # Run all tests (Vitest)
```

### Database Management
```bash
pnpm migrate:generate       # Generate new migration from schema changes
pnpm migrate:push          # Push schema changes directly (dev only)
pnpm migrate:migrate       # Apply pending migrations (idempotent)
pnpm migrate:check         # Show pending migrations
pnpm migrate:verify-rollback  # CI safety: transactional apply + rollback
```

### Web App Specific (from apps/web/)
```bash
pnpm dev                    # Start Next.js dev server
pnpm build                  # Build Next.js production bundle
pnpm start                  # Start production server
pnpm lint                   # Lint web app
pnpm typecheck             # Type check web app
pnpm test                   # Run web app tests
```

### Database Package (from packages/db/)
```bash
pnpm generate              # Generate migrations (drizzle-kit generate)
pnpm push                  # Push schema changes (drizzle-kit push)
pnpm migrate               # Apply migrations (drizzle-kit migrate)
pnpm check                 # Check migrations status
pnpm ping                  # Test database connection
pnpm bootstrap             # Manual database bootstrap
```

### Testing (from packages/testkits/)
```bash
pnpm test                   # Run all tests
pnpm test:watch            # Run tests in watch mode
pnpm e2e                   # Run Playwright E2E tests
NIGHTLY=true pnpm test     # Run extended nightly test suites
```

## First-Time Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

3. **Create database:**
   ```bash
   createdb conlang_studio
   # Or use your PostgreSQL admin tool
   ```

4. **Run migrations:**
   ```bash
   pnpm migrate:migrate
   ```

5. **Start development:**
   ```bash
   pnpm dev
   ```

## Environment Variables
Required variables (see `.env.example`):
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: conlang_studio)

Optional feature flags:
- `FEATURE_VALIDATORS_PANEL=true` - Enable validators panel
- `OVERLAYS_DEV_FALLBACK=true` - Use in-memory overlay storage (dev only)

## Common Workflows

### Creating a New Migration
```bash
# 1. Edit schema in packages/db/schema/core.ts
# 2. Generate migration
pnpm migrate:generate
# 3. Review generated SQL in packages/db/migrations/
# 4. Apply migration
pnpm migrate:migrate
```

### Running Tests with Coverage
```bash
pnpm test                   # All tests
pnpm --filter testkits test # Just test package
pnpm --filter web test      # Just web app tests
```

### Debugging Database Connection
```bash
cd packages/db
pnpm ping                   # Test connection
```

## System Commands (Linux)
Standard Linux commands are available:
- `git` - Version control
- `ls`, `cd` - File navigation
- `grep`, `find` - Search utilities
- `cat`, `less` - File viewing