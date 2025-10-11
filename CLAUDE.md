# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Conlang Studio is a comprehensive web application for constructing artificial languages (conlangs). It provides tools for designing and managing all aspects of a constructed language including phonology, morphology, syntax, semantics, orthography, lexicon, sociolinguistics, and diachronic evolution.

**Tech Stack**: TypeScript monorepo using pnpm + Turborepo, Next.js 15 (App Router), PostgreSQL + Drizzle ORM, TanStack Query, Material-UI, Vitest, Playwright.

## Common Commands

### Development
```bash
pnpm dev                    # Start all dev servers
pnpm build                  # Build all packages
pnpm lint                   # Run ESLint
pnpm typecheck              # TypeScript type checking
pnpm test                   # Run all tests
pnpm --filter testkits test:watch  # Watch mode for tests
pnpm --filter testkits e2e  # Run E2E tests
NIGHTLY=true pnpm test      # Extended test suites
```

### Database Operations
```bash
pnpm migrate:generate       # Generate migration from schema changes
pnpm migrate:migrate        # Apply pending migrations (idempotent)
pnpm migrate:check          # Show pending migrations
pnpm migrate:verify-rollback # CI safety check (apply + rollback)
cd packages/db && pnpm ping # Test database connection
```

### Package-Specific Commands
```bash
# Web app
pnpm --filter web dev       # Start Next.js dev server
pnpm --filter web build     # Build production bundle

# Database package
pnpm --filter db generate   # Generate migrations
pnpm --filter db migrate    # Apply migrations
```

## Architecture Principles

### Monorepo Structure
The project follows a strict separation of concerns:
- **apps/web**: Next.js application (UI, API routes, pages)
- **packages/core**: Domain logic, business rules, Zod schemas, services
- **packages/db**: Database schema, migrations, Drizzle ORM
- **packages/testkits**: Shared test utilities and test suites
- **packages/config**: Shared configuration files

**Import aliases**: Use `@core/*` for packages/core and `@db/*` for packages/db.

### Event-Sourced Architecture
The system uses **event sourcing** with immutable events and periodic snapshots:
- All state changes emit events to `events` table
- Snapshots created at size/time thresholds
- **Deterministic replay** is required - avoid non-deterministic operations in domain logic
- Event taxonomy: CREATE, UPDATE, DELETE, IMPORT, BATCH_APPLY, METRIC_RECOMPUTE

### Domain-Driven Design
Each domain module in `packages/core/` follows this structure:
```
domain/
├── types.ts      # Zod schemas and TypeScript types
├── service.ts    # Business logic, CRUD operations, engines
└── index.ts      # Public exports
```

Key domains: phonology, morphology, syntax, semantics, orthography, lexicon, sociolinguistics (borrowing, overlays, register), diachrony, metrics, validation.

### Database Conventions
- **Schema location**: `packages/db/schema/core.ts`
- **Migrations**: Raw SQL in `packages/db/migrations/` (numbered sequentially)
- **Naming**: snake_case for tables and columns
- **JSONB**: Used for flexible schemas (features, rules, configurations) with `_jsonb` suffix
- **Indexes**: Composite indexes on `(language_id, order)` for ordered entities; GIN indexes for JSONB
- **Foreign keys**: Explicit with `_id` suffix; careful cascade policies (prefer soft-delete via events)

### Data Flow Pattern
1. UI components use **TanStack Query** hooks for server state
2. Hooks call API routes in `apps/web/app/api/`
3. API routes call domain services in `packages/core/`
4. Services perform business logic and emit events
5. Services use Drizzle ORM to interact with PostgreSQL
6. Redis caching layer (planned) for computed artifacts
7. Granular cache invalidation (not global flushes)

## Making Schema Changes

When modifying the database schema:

1. **Edit schema**: Update `packages/db/schema/core.ts`
2. **Generate migration**: Run `pnpm migrate:generate`
3. **Review SQL**: Check generated files in `packages/db/migrations/`
4. **Test locally**: Run `pnpm migrate:migrate`
5. **Verify rollback**: Run `pnpm migrate:verify-rollback` (CI requirement)
6. **Naming convention**: See `docs/migration_naming.md` for sequential numbering
7. **Update types**: Rebuild packages with `pnpm build`

⚠️ Migrations must be **idempotent** and **reversible** where possible.

## Testing Strategy

### Test Categories
- **Unit tests**: Test individual functions/modules in isolation
- **Integration tests**: Test module interactions with real database (@electric-sql/pglite)
- **E2E tests**: Test user workflows in browser (Playwright)
- **Property tests**: Test invariants hold across many inputs

### Test Organization
- Unit tests: Colocated with source or near modules
- Integration tests: `packages/testkits/tests/*.test.ts`
- E2E tests: `packages/testkits/e2e/*.spec.ts`
- Test utilities: `packages/testkits/tests/utils/`

### Running Specific Tests
```bash
# Single test file
pnpm --filter testkits test tests/overlay.service.test.ts

# With verbose output
pnpm --filter testkits test --reporter=verbose

# E2E tests
pnpm --filter testkits e2e

# Extended nightly suites
NIGHTLY=true pnpm --filter testkits test
```

### Performance Targets
From `docs/task_checklist.md`:
- Stem generation: p95 < 1.5s
- Borrowing pipeline: p95 < 2s (small dataset)
- Evolution job (100 lexemes): < 5 minutes
- Replay must be deterministic across runs

## Code Style

### TypeScript Configuration
- **Target**: ES2024, ESNext modules
- **Strict mode**: Fully enabled
- **Path aliases**: `@core/*`, `@db/*`

### Naming Conventions
- **Files**: PascalCase for components (`FrameBuilder.tsx`), camelCase for utilities (`service.ts`)
- **Code**: PascalCase for types/interfaces, camelCase for variables/functions
- **Database**: snake_case for everything
- **Test files**: `*.test.ts` or `*.spec.ts`

### ESLint Rules
- TypeScript recommended rules enabled
- React plugin for web app
- `@typescript-eslint/no-unused-vars`: warn
- `@typescript-eslint/no-explicit-any`: warn

### Module Organization
- Each domain service exports operations via `index.ts`
- Zod schemas defined in `types.ts` serve as single source of truth
- Business logic in `service.ts` - keep lean and testable

## Understanding the Domain Model

### Core Linguistic Systems
The application models these linguistic domains (matching comprehensive linguistic framework in `docs/framework.md`):

1. **Phonology**: Phoneme inventories, phonotactic rules, suprasegmentals, allophony
2. **Morphology**: Templates, morphemes, features, non-concatenative morphology (roots/patterns)
3. **Syntax**: Word order, agreement, rules, clause structure
4. **Semantics**: Frames, senses, relations, idioms, classifier systems
5. **Orthography**: Script mappings, transliteration, grapheme-phoneme correspondence
6. **Lexicon**: Lexemes with phonological, morphological, and semantic properties
7. **Sociolinguistics**: Variant overlays, borrowing pipeline, style policies, register
8. **Diachrony**: Sound changes, lexical evolution, semantic drift, language families
9. **Metrics**: Complexity metrics (articulatory load, ambiguity, processing load)

### Key Engines
- **Rewrite engine**: Ordered phonological rules with feature-based environments
- **Unification engine**: Agreement and case assignment in morphosyntax
- **Borrowing pipeline**: Multi-stage adaptation (phonological → morphological → semantic)
- **Overlay resolution**: Variant precedence chains with conflict detection
- **Pattern expansion**: Non-concatenative morphology (roots + patterns)

### Multi-Tenancy & Security
- Per-language membership roles: owner/editor/viewer/guest (`language_members` table)
- Event visibility restricted to members
- Audit events for security-relevant operations
- Rate limiting on expensive operations (borrowing intake, metrics recomputation)

## Important Patterns

### API Route Structure
Routes follow RESTful conventions:
```
/api/languages/[id]/semantics/frames      # Frame CRUD
/api/languages/[id]/sociolinguistics/borrowing  # Borrowing operations
/api/languages/[id]/metrics               # Metrics snapshots
/api/languages/[id]/diachrony/lexical     # Evolution operations
```

- Use Zod for request/response validation
- Emit events for audit trail
- Return appropriate HTTP status codes
- Handle cache invalidation

### React Component Patterns
- **Presentational components**: Dumb, reusable UI (in `apps/web/lib/ui/`)
- **Container components**: Connect to TanStack Query hooks
- **State management**: Zustand for local UI, TanStack Query for server state
- **Styling**: Material-UI with Emotion

### Cache Invalidation
Invalidation is **granular**, not global:
- Changing a phonological rule invalidates affected derivations only
- Changing a root invalidates its root_pattern_bindings
- Changing a pattern invalidates bindings referencing it
- Use entity-type → cache bucket mappings

### Deterministic Operations
Because of event sourcing and replay requirements:
- ❌ Avoid `Math.random()`, `Date.now()`, `uuid()` in domain logic
- ✅ Pass timestamps/IDs as parameters from API layer
- ✅ Ensure rule application order is deterministic
- ✅ Test replay produces identical results

## Common Workflows

### Adding a New Domain Feature
1. Define Zod schemas in `packages/core/{domain}/types.ts`
2. Add database tables to `packages/db/schema/core.ts`
3. Generate and apply migration
4. Implement service operations in `packages/core/{domain}/service.ts`
5. Add API routes in `apps/web/app/api/{domain}/`
6. Create UI components in `apps/web/lib/ui/`
7. Add integration tests in `packages/testkits/tests/`
8. Update documentation in `docs/`

### Debugging Database Issues
```bash
# Check connection
cd packages/db && pnpm ping

# Show pending migrations
pnpm migrate:check

# Inspect database directly
psql conlang_studio

# Check migration status
cd packages/db && pnpm status
```

### Fixing Type Errors After Updates
```bash
# Clear caches and rebuild
rm -rf node_modules .turbo
pnpm install
pnpm build
pnpm typecheck
```

## Development Guidelines

### Before Committing
- Run `pnpm lint` and fix errors
- Run `pnpm typecheck` and resolve type errors
- Run `pnpm test` and ensure all pass
- Run `pnpm build` and verify success
- Review migrations if schema changed
- Update relevant documentation

### When Writing Tests
- Use descriptive test names that explain behavior
- Use golden files for regression tests
- Property-based tests for invariants
- Integration tests use @electric-sql/pglite (in-memory Postgres)
- Ensure deterministic replay tests pass

### Performance Considerations
- Memoize expensive computations
- Use incremental recomputation (not full rebuilds)
- Batch processing for diachrony pipelines
- Debounce metrics recomputation (e.g., 5m after last edit)
- Target WASM for hot paths (rewrite matcher, FST composition)

### Documentation Requirements
- Update `docs/architecture.md` for architectural changes
- Update `docs/implementation_plan.md` for feature additions
- Update `docs/task_checklist.md` progress markers
- Add JSDoc comments for public APIs
- Inline comments for complex algorithms only

## Key Files to Know

### Configuration
- `pnpm-workspace.yaml`: Workspace definition
- `turbo.json`: Task pipeline configuration
- `tsconfig.json`: TypeScript root config
- `.env`: Environment variables (local, not committed)
- `.env.example`: Environment template

### Documentation
- `docs/architecture.md`: Comprehensive architecture overview
- `docs/framework.md`: Linguistic framework guiding design
- `docs/task_checklist.md`: Phase progress and completion criteria
- `docs/migration_naming.md`: Migration naming conventions
- `docs/implementation_plan.md`: Implementation roadmap

### Entry Points
- `apps/web/app/layout.tsx`: Root layout with providers
- `apps/web/app/page.tsx`: Landing page
- `packages/db/schema/core.ts`: Complete database schema

## Phased Implementation

The project follows a phased roadmap (see `docs/task_checklist.md`):
- **Phase 1**: Semantics core, non-concatenative morphology, validation extensions, metrics scaffolding
- **Phase 2**: Borrowing pipeline, variant overlays, initial metrics
- **Phase 3**: Diachrony change logs, evolution timeline, expanded metrics
- **Phase 4**: WASM optimizations, Y.js collaboration
- **Phase 5**: Security hardening, deterministic replay gating

Each phase has quality gates: build/lint/typecheck pass, tests pass, performance targets met, docs updated, no critical bugs.

## Environment Setup

Required environment variables (see `.env.example`):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=app
DB_PASSWORD=dev
DB_NAME=conlang_studio
```

Optional feature flags:
```bash
FEATURE_VALIDATORS_PANEL=true    # Enable validators UI
OVERLAYS_DEV_FALLBACK=true       # Use in-memory overlay storage (dev only)
```

## Getting Started

First-time setup:
```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Create database
createdb conlang_studio

# Run migrations
pnpm migrate:migrate

# Start development
pnpm dev
```

## Additional Resources

- **README.md**: Quick start and basic usage
- **docs/architecture.md**: Deep dive into system architecture
- **docs/framework.md**: Linguistic theory and domain modeling
- **docs/overlay_local_dev.md**: Variant overlay development guide
- **docs/style_policies.md**: Style policy JSON schema
- **docs/job_events.md**: Job event schema and patterns
