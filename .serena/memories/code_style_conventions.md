# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2024
- **Module System**: ESNext with Bundler resolution
- **Strict Mode**: Enabled (all strict checks on)
- **Import Resolution**: Path aliases configured:
  - `@core/*` → `packages/core/*`
  - `@db/*` → `packages/db/*`

## Linting (ESLint)
Configuration file: `eslint.config.js`

### Rules Applied
- **Base**: ESLint recommended + TypeScript recommended
- **Next.js**: `next/core-web-vitals` and `next/typescript` for apps/web
- **React**: React plugin enabled
  - `react/react-in-jsx-scope`: off (not needed with modern React)
  - `react/jsx-uses-react`: off
  - `react/jsx-uses-vars`: warn

### TypeScript Specific
- `@typescript-eslint/no-unused-vars`: warn
- `@typescript-eslint/no-explicit-any`: warn

### Ignored Paths
- `.next/**` - Next.js build output
- `dist/**` - Build artifacts
- `build/**` - Build artifacts
- `coverage/**` - Test coverage
- `node_modules/**` - Dependencies
- `next-env.d.ts` - Generated types
- `**/*.d.ts` - Declaration files (excluded from type-aware linting)

## Formatting (Prettier)
Prettier 3.6.2 is installed but no explicit configuration file exists.
Likely using Prettier defaults:
- 2 spaces indentation
- Single quotes for strings
- Semicolons enabled
- Trailing commas: es5

## Naming Conventions

### Files & Directories
- React components: PascalCase (e.g., `FrameBuilder.tsx`, `AppShell.tsx`)
- Services/utilities: camelCase (e.g., `service.ts`, `types.ts`)
- API routes: kebab-case or lowercase (Next.js convention)
- Test files: `*.test.ts` or `*.spec.ts`

### Code
- **Interfaces/Types**: PascalCase
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE (for true constants)
- **Database tables**: snake_case (e.g., `semantic_frames`, `lexeme_senses`)
- **JSONB columns**: snake_case with `_jsonb` suffix (e.g., `features_jsonb`, `payload_jsonb`)

## Database Conventions

### Migrations
- **Location**: `packages/db/migrations/`
- **Format**: Raw SQL with Drizzle Kit
- **Naming**: See `docs/migration_naming.md` (sequential numbered format)
- **Snapshots**: Metadata in `migrations/meta/`
- **Idempotency**: All migrations should be idempotent where possible

### Schema Design
- **Primary Keys**: `id` column (auto-increment or UUID)
- **Foreign Keys**: Explicit with `_id` suffix (e.g., `language_id`)
- **Timestamps**: `created_at`, `updated_at` standard naming
- **JSONB Usage**: For flexible schemas (features, rules, configurations)
- **Indexes**: 
  - Composite: `(language_id, order)` for ordered entities
  - GIN: For JSONB columns
  - Partial: For conditional queries (e.g., `is_active`)

## Module Organization

### Core Package Structure
Each domain module in `packages/core/` should contain:
- `types.ts` - Zod schemas and TypeScript types
- `service.ts` - Business logic and operations
- `index.ts` - Public API exports

### Component Structure (Web App)
- **Location**: `apps/web/lib/ui/` for shared components
- **Organization**: 
  - Presentational components (dumb)
  - Container components with hooks
- **State**: Zustand for local, TanStack Query for server
- **Styling**: Material-UI with Emotion

## Testing Conventions

### Test Organization
- **Unit Tests**: Colocated with or near source files
- **Integration Tests**: `packages/testkits/tests/`
- **E2E Tests**: `packages/testkits/e2e/`
- **Test Utilities**: `packages/testkits/tests/utils/`

### Test Naming
- Describe behavior, not implementation
- Use property-based tests for invariants
- Golden files for regression tests
- Deterministic replay tests for event sourcing

### Test Categories
- Short-run smoke tests (default)
- Long-run nightly suites (enable with `NIGHTLY=true`)
- Performance benchmarks (p50, p95, p99 targets)

## API Conventions

### Route Structure
- **Location**: `apps/web/app/api/`
- **Naming**: RESTful conventions
- **Handlers**: `route.ts` files with exported HTTP methods
- **Validation**: Zod schemas for request/response

### Response Format
- Success: JSON with data payload
- Errors: Appropriate HTTP status codes with error messages
- Events: Emit via event system for audit trail

## Documentation

### Required Documentation
- Architecture decisions in `docs/architecture.md`
- Implementation plans in `docs/implementation_plan.md`
- Migration conventions in `docs/migration_naming.md`
- Task tracking in `docs/task_checklist.md`

### Code Comments
- Use JSDoc for public APIs
- Inline comments for complex logic
- No obvious comments (let code self-document)

## Version Control

### Commit Messages
- Concise, descriptive
- Reference task IDs when applicable
- Focus on "why" not "what"

### PR Requirements
- Architecture impact section in description
- Tests added/updated
- Docs updated if needed
- Type checking passes
- Linting passes