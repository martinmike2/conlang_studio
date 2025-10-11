# Codebase Structure

## High-Level Organization

Conlang Studio is organized as a **pnpm monorepo** using **Turborepo** for orchestration.

```
conlang_studio/
├── apps/                      # Application packages
│   └── web/                   # Next.js 15 web application
│       ├── app/               # Next.js App Router
│       │   ├── api/           # API route handlers
│       │   ├── dashboard/     # Dashboard pages
│       │   ├── morphology/    # Morphology pages
│       │   ├── semantics/     # Semantics pages
│       │   ├── validators/    # Validators pages
│       │   ├── borrowing/     # Borrowing feature pages (new)
│       │   ├── languages/     # Language management (new)
│       │   ├── metrics/       # Metrics dashboard (new)
│       │   ├── overlays/      # Variant overlays (new)
│       │   ├── register/      # Register & style audit (new)
│       │   └── auth/          # Authentication pages (new)
│       ├── lib/               # Shared libraries
│       │   ├── ui/            # UI components
│       │   ├── hooks/         # React hooks (TanStack Query)
│       │   ├── providers/     # Context providers
│       │   ├── auth/          # Auth utilities (new)
│       │   └── types/         # Type definitions (new)
│       └── tests/             # Web app tests
│
├── packages/
│   ├── core/                  # Domain logic & business rules
│   │   ├── activity/          # Activity logging
│   │   ├── borrowing/         # Borrowing pipeline (new)
│   │   ├── diachrony/         # Historical evolution (new)
│   │   ├── loanFlags/         # Loan word tracking (new)
│   │   ├── metrics/           # Complexity metrics (new)
│   │   ├── morphology/        # Morphological services
│   │   ├── overlays/          # Variant overlay engine (new)
│   │   ├── register/          # Style policies & register (new)
│   │   ├── semantics/         # Semantic frames & senses
│   │   ├── validation/        # Validation rules
│   │   ├── context.ts         # Request context
│   │   ├── env.ts             # Environment config
│   │   ├── jobs.ts            # Job definitions
│   │   ├── logger.ts          # Structured logging (Pino)
│   │   └── metrics.ts         # Metrics registry
│   │
│   ├── db/                    # Database layer
│   │   ├── migrations/        # Raw SQL migrations (Drizzle)
│   │   │   ├── meta/          # Migration metadata
│   │   │   └── *.sql          # Migration files (0005-0014+)
│   │   ├── schema/            # Drizzle schema definitions
│   │   │   └── core.ts        # Core schema
│   │   └── scripts/           # Database utilities
│   │       ├── db-ping.ts     # Connection test
│   │       └── manual-bootstrap.ts
│   │
│   ├── testkits/              # Testing infrastructure
│   │   ├── e2e/               # Playwright E2E tests (new)
│   │   ├── tests/             # Integration & unit tests
│   │   │   ├── utils/         # Test utilities
│   │   │   ├── borrowing.*.test.ts     # Borrowing tests (new)
│   │   │   ├── diachrony.*.test.ts     # Diachrony tests (new)
│   │   │   ├── loanFlags.*.test.ts     # Loan flags tests (new)
│   │   │   ├── metrics.*.test.ts       # Metrics tests (new)
│   │   │   ├── morphology.*.test.ts    # Morphology tests
│   │   │   ├── overlay.*.test.ts       # Overlay tests (new)
│   │   │   └── register.*.test.ts      # Register tests (new)
│   │   ├── test-results/      # Test output artifacts
│   │   └── playwright.config.ts # Playwright config (new)
│   │
│   └── config/                # Shared configuration
│
├── docs/                      # Documentation
│   ├── architecture.md        # Architecture overview (comprehensive)
│   ├── framework.md           # Framework guidelines
│   ├── implementation_plan.md # Implementation roadmap
│   ├── task_checklist.md      # Phase progress tracking
│   ├── migration_naming.md    # Migration conventions
│   ├── style_policies.md      # Style policy format
│   ├── overlay.md             # Overlay system docs (new)
│   ├── overlay_local_dev.md   # Overlay dev guide (new)
│   └── job_events.md          # Job event schema
│
├── scripts/                   # Build & utility scripts
├── .github/                   # GitHub workflows (CI/CD)
├── .claude/                   # Claude Code configuration
├── .rag_store/                # RAG embeddings cache
├── .serena/                   # Serena project config
└── .vscode/                   # VS Code settings
```

## Key Files

### Configuration Files
- `pnpm-workspace.yaml` - Workspace definition
- `turbo.json` - Turborepo task configuration
- `tsconfig.json` - Root TypeScript config
- `eslint.config.js` - ESLint configuration
- `.env` - Environment variables (local, not committed)
- `.env.example` - Environment template
- `docker-compose.yml` - Docker services (new)
- `.mcp.json` - MCP server configuration (new)
- `rag_config.yaml` - RAG configuration (new)

### Entry Points
- `apps/web/app/layout.tsx` - Root layout with providers
- `apps/web/app/page.tsx` - Landing page
- `packages/core/index.ts` - Core exports (if exists)
- `packages/db/schema/core.ts` - Database schema

## Module Dependencies

### Import Path Aliases
Configured in `tsconfig.json`:
- `@core/*` → `packages/core/*`
- `@db/*` → `packages/db/*`

### Dependency Flow
```
apps/web
  ├─→ packages/core (domain logic)
  │    └─→ packages/db (data access)
  └─→ packages/db (direct for migrations)

packages/testkits
  ├─→ packages/core
  └─→ packages/db
```

## Domain Module Structure

Each domain module in `packages/core/` typically contains:
- `types.ts` - Zod schemas and TypeScript types
- `service.ts` - Business logic and CRUD operations
- `index.ts` - Public exports

Example: `packages/core/semantics/`
```
semantics/
├── types.ts      # Frame, Sense, Relation schemas
├── service.ts    # Frame CRUD, sense operations
└── index.ts      # Re-exports
```

## Database Schema Organization

### Core Tables (in `packages/db/schema/core.ts`)
- Languages & metadata
- Phonology: phonemes, phonotactic_rules, phon_rules, suprasegmentals
- Morphology: morph_features, morphemes, templates, roots, patterns (new)
- Syntax: syntax_params, syntax_rules
- Semantics: semantic_frames, lexeme_senses, sense_relations, idioms (new)
- Orthography: orthographies
- Lexicon: lexemes
- Sociolinguistics: contact_events, loan_rulesets, style_policies, variant_overlays (new)
- Metrics: usage_stats, complexity_snapshots, metrics_jobs (new)
- Diachrony: change_sets, lexical_change_logs, semantic_shift_logs (new)
- Security: language_members (new), auth tables (new)
- Versioning: events, snapshots

### Migration Files
Located in `packages/db/migrations/`:
- `0005_borrowing_contact_events.sql`
- `0006_borrowing_loan_rulesets.sql`
- `0007_style_policies.sql`
- `0008_code_switch_profiles.sql`
- `0009_loan_flags.sql`
- `0010_variant_overlays.sql`
- `0011_variant_overlays_created_at_index.sql`
- `0012_variant_overlays_language_name_unique.sql`
- `0013_auth_and_user_languages.sql`
- `0014_diachrony_logs.sql`

## UI Component Organization

### Component Locations
- **Shared UI**: `apps/web/lib/ui/`
  - `AppShell.tsx` - Main app shell with navigation
  - `WizardStepper.tsx` - Multi-step wizard
  - `BorrowingWizard.tsx` - Borrowing intake (new)
  - `FrameBuilder.tsx` - Semantic frame editor
  - `LanguageSwitcher.tsx` - Language selector (new)
  - `MetricsDashboard.tsx` - Metrics visualization (new)
  - `RegisterAuditPanel.tsx` - Style audit panel (new)
  - `VariantOverlayDiff.tsx` - Overlay diff viewer (new)

### Hooks
- `apps/web/lib/hooks/useActivityLog.ts`
- `apps/web/lib/hooks/useFrames.ts`
- `apps/web/lib/hooks/useMorphologyInventory.ts`
- `apps/web/lib/hooks/useSemanticsEvents.ts`
- `apps/web/lib/hooks/useSenseNetwork.ts`

### Providers
- `apps/web/lib/providers/ThemeModeProvider.tsx` - Theme context
- `apps/web/lib/providers/ActiveLanguageProvider.tsx` - Active language context (new)
- `apps/web/lib/providers/ClientProviders.tsx` - Client-side providers (new)

## Testing Structure

### Test Categories
- **Unit Tests**: Colocated with modules
- **Integration Tests**: `packages/testkits/tests/*.test.ts`
- **E2E Tests**: `packages/testkits/e2e/*.spec.ts`
- **Utilities**: `packages/testkits/tests/utils/`

### Test Utilities
- `morphologyTestUtils.ts` - Morphology test helpers
- `diachronyTestUtils.ts` - Diachrony test helpers (new)

## Build Artifacts (Ignored)
- `.next/` - Next.js build output
- `dist/` - Package builds
- `node_modules/` - Dependencies
- `coverage/` - Test coverage reports
- `.turbo/` - Turborepo cache
- `test-results/` - Test outputs

## Feature Flags & Environment
- `FEATURE_VALIDATORS_PANEL=true` - Enable validators UI
- `OVERLAYS_DEV_FALLBACK=true` - Use in-memory overlay storage
- `DB_*` - Database connection settings
- `NIGHTLY=true` - Enable extended test suites