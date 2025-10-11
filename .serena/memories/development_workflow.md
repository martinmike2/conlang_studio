# Development Workflow

## Daily Development Workflow

### Starting a New Task

1. **Update from main**
   ```bash
   git checkout main
   git pull
   ```

2. **Create feature branch** (if applicable)
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Install dependencies** (if package.json changed)
   ```bash
   pnpm install
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

### During Development

1. **Run tests in watch mode**
   ```bash
   # For specific package
   pnpm --filter testkits test:watch
   
   # For web app
   pnpm --filter web test
   ```

2. **Check types continuously**
   ```bash
   pnpm typecheck
   ```

3. **Lint code**
   ```bash
   pnpm lint
   ```

### Working with Database

#### Making Schema Changes

1. **Edit schema**
   - File: `packages/db/schema/core.ts`
   - Define tables using Drizzle ORM syntax

2. **Generate migration**
   ```bash
   pnpm migrate:generate
   ```

3. **Review migration SQL**
   - Check files in `packages/db/migrations/`
   - Verify migration is correct and safe

4. **Apply migration locally**
   ```bash
   pnpm migrate:migrate
   ```

5. **Test migration rollback**
   ```bash
   pnpm migrate:verify-rollback
   ```

#### Checking Migration Status

```bash
pnpm migrate:check          # Show pending migrations
cd packages/db && pnpm status  # Drizzle status
```

#### Testing Database Connection

```bash
cd packages/db
pnpm ping
```

## Testing Workflow

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter testkits test
pnpm --filter web test

# Watch mode
pnpm --filter testkits test:watch

# E2E tests
pnpm --filter testkits e2e

# Nightly extended tests
NIGHTLY=true pnpm --filter testkits test
```

### Writing Tests

1. **Unit tests**: Test individual functions/modules
   - Use Vitest
   - Mock dependencies
   - Fast and isolated

2. **Integration tests**: Test module interactions
   - Use real database (@electric-sql/pglite for in-memory Postgres)
   - Test full workflows
   - Located in `packages/testkits/tests/`

3. **E2E tests**: Test user workflows
   - Use Playwright
   - Test in browser
   - Located in `packages/testkits/e2e/`

4. **Property tests**: Test invariants
   - Use Vitest with property-based generators
   - Test that properties hold for many inputs

### Test Naming Conventions

```typescript
// Unit test
describe('FrameService', () => {
  it('creates frame with valid name', () => { ... })
  it('rejects frame with empty name', () => { ... })
})

// Integration test
describe('Borrowing Pipeline', () => {
  it('adapts donor form through phonological rules', () => { ... })
  it('integrates adapted form into lexicon', () => { ... })
})

// E2E test
test('user can create and edit semantic frame', async ({ page }) => { ... })
```

## Build Workflow

### Development Build

```bash
pnpm dev              # Start all dev servers
```

### Production Build

```bash
pnpm build            # Build all packages
pnpm --filter web build  # Build only web app
```

### Build Verification

```bash
# Clean build test
rm -rf node_modules .turbo
pnpm install
pnpm build
pnpm test
```

## Code Quality Workflow

### Pre-Commit Checks

Run these before committing:

```bash
pnpm lint             # Fix linting issues
pnpm typecheck        # Fix type errors
pnpm test             # Ensure tests pass
pnpm build            # Ensure build succeeds
```

### Auto-Fixing

```bash
# ESLint auto-fix
pnpm lint --fix

# Prettier format (if configured)
pnpm format
```

## Debugging Workflow

### Debugging Tests

```bash
# Run single test file
pnpm --filter testkits test tests/overlay.service.test.ts

# Run with verbose output
pnpm --filter testkits test --reporter=verbose

# Debug mode (wait for debugger)
NODE_OPTIONS='--inspect-brk' pnpm test
```

### Debugging Web App

1. **Use Next.js dev server**
   ```bash
   pnpm --filter web dev
   ```

2. **Browser DevTools**
   - React DevTools extension
   - TanStack Query DevTools (if enabled)

3. **Server-side debugging**
   - Add `console.log` or use debugger
   - Check terminal output for API routes

### Debugging Database

```bash
# Test connection
cd packages/db && pnpm ping

# Check migration status
pnpm migrate:check

# Inspect database directly
psql conlang_studio
```

## Performance Workflow

### Measuring Performance

1. **Check benchmark targets**
   - See `docs/task_checklist.md` for targets
   - Example: stem generation p95 < 1.5s

2. **Run performance tests**
   ```bash
   pnpm --filter testkits test tests/borrowing.performance.test.ts
   ```

3. **Profile hot paths**
   - Use Node.js profiler
   - Check Turborepo task timing

### Performance Targets (from checklist)

- Stem generation: p95 < 1.5s
- Borrowing pipeline: p95 < 2s (small dataset)
- Evolution job (100 lexemes): < 5 minutes
- Replay determinism: stable across runs

## Phase-Based Workflow

The project follows a phased implementation (see `docs/task_checklist.md`):

### Current Phase: Phase 1
- Semantics core
- Non-concatenative morphology
- Validation extensions
- Metrics scaffolding

### Completing Phase Tasks

1. Check task checklist: `docs/task_checklist.md`
2. Mark tasks in progress with `[~]`
3. Complete exit validation criteria
4. Update checklist with `[x]` when done

### Phase Quality Gates

Before completing a phase:
- [ ] Build & Lint PASS
- [ ] Typecheck PASS
- [ ] Unit tests PASS
- [ ] Property tests PASS
- [ ] Replay determinism PASS
- [ ] Performance targets met
- [ ] Docs updated
- [ ] No critical bugs

## Collaboration Workflow

### Code Review Checklist

When reviewing PRs:
- [ ] Code follows style conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Migrations safe and reversible
- [ ] Performance acceptable
- [ ] No security issues
- [ ] Architecture impact assessed

### PR Template

Include in PR description:
- **Summary**: What changed and why
- **Architecture Impact**: Any structural changes
- **Testing**: How to test the changes
- **Performance**: Any performance implications
- **Breaking Changes**: List any breaking changes
- **Checklist**: All items from task completion checklist

## Troubleshooting Common Issues

### "Cannot find module" errors
```bash
# Clear caches and reinstall
rm -rf node_modules .turbo
pnpm install
```

### Type errors after git pull
```bash
# Rebuild packages
pnpm build
pnpm typecheck
```

### Database connection failures
```bash
# Check .env settings
cat .env

# Test connection
cd packages/db && pnpm ping

# Verify database exists
psql -l | grep conlang_studio
```

### Test failures after schema changes
```bash
# Regenerate migrations
pnpm migrate:generate
pnpm migrate:migrate

# Clear test database
# Tests use in-memory database, should auto-reset
pnpm test
```

### Turbo cache issues
```bash
# Clear Turbo cache
rm -rf .turbo
pnpm build
```