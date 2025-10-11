# Task Completion Checklist

When completing a development task in Conlang Studio, follow these steps:

## Before Committing

### 1. Code Quality
- [ ] **Lint**: Run `pnpm lint` and fix all errors
- [ ] **Type Check**: Run `pnpm typecheck` and fix all type errors
- [ ] **Format**: Ensure code is properly formatted (Prettier)
- [ ] **Remove Debug Code**: Remove console.logs, debugger statements, commented code

### 2. Testing
- [ ] **Unit Tests**: Add/update unit tests for new functionality
- [ ] **Integration Tests**: Add integration tests if applicable
- [ ] **All Tests Pass**: Run `pnpm test` and ensure all tests pass
- [ ] **Test Coverage**: Verify coverage meets thresholds (target: 60%+, progressing to 85%)

### 3. Database Changes
If you modified the database schema:
- [ ] **Migration Created**: Run `pnpm migrate:generate` to create migration
- [ ] **Migration Reviewed**: Review generated SQL in `packages/db/migrations/`
- [ ] **Migration Applied**: Run `pnpm migrate:migrate` to test migration
- [ ] **Rollback Tested**: Run `pnpm migrate:verify-rollback` for safety
- [ ] **Migration Named**: Follow naming convention in `docs/migration_naming.md`

### 4. Documentation
- [ ] **Code Comments**: Add JSDoc for public APIs
- [ ] **Architecture**: Update `docs/architecture.md` if architecture changed
- [ ] **README**: Update relevant README files if needed
- [ ] **Task Checklist**: Update `docs/task_checklist.md` progress
- [ ] **API Documentation**: Document new endpoints/features

### 5. Performance & Validation
- [ ] **Performance**: Check performance targets if applicable (see task_checklist.md)
- [ ] **Validators**: Add validators to QA panel if new validation logic
- [ ] **Event Emission**: Ensure events are emitted for audit trail (CREATE/UPDATE/DELETE)
- [ ] **Cache Invalidation**: Handle cache invalidation correctly

### 6. Specific Checks by Feature Type

#### For API Changes
- [ ] Zod validation schemas defined
- [ ] Error handling implemented
- [ ] Response format consistent
- [ ] Rate limiting considered (for sensitive endpoints)

#### For UI Changes
- [ ] Responsive design checked
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states designed

#### For Domain Logic
- [ ] Event sourcing maintained
- [ ] Deterministic replay verified (if applicable)
- [ ] Granular invalidation implemented
- [ ] Dependencies documented

### 7. Build Verification
- [ ] **Clean Build**: Run `pnpm build` successfully
- [ ] **No Build Warnings**: Address any build warnings
- [ ] **Dev Mode Works**: Test in dev mode (`pnpm dev`)

## Git Workflow

### Committing
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Brief description of changes

More detailed explanation if needed.
- Specific change 1
- Specific change 2

Closes #issue-number (if applicable)"
```

### Pre-Push Checklist
- [ ] All commits are atomic and well-described
- [ ] No sensitive data in commits (.env, credentials, etc.)
- [ ] Migrations are included if schema changed
- [ ] Tests pass locally
- [ ] Build succeeds

## Phase-Specific Gates

### Phase Quality Gates (from task_checklist.md)
- [ ] Build & Lint PASS
- [ ] Typecheck PASS
- [ ] Unit tests PASS (coverage target)
- [ ] Property tests PASS
- [ ] Replay determinism PASS (Phase ≥1)
- [ ] Performance snapshot archived (if performance-sensitive)
- [ ] Docs updated (architecture delta + implementation sync)
- [ ] Open critical bugs: 0

## Definition of Done

A task is complete when:
- [ ] Code merged to main/feature branch
- [ ] All tests added & green
- [ ] Documentation updated
- [ ] Telemetry/observability verified (if applicable)
- [ ] Replay integrity unaffected (event sourcing)
- [ ] No high-severity issues open
- [ ] Benchmarks updated (if performance-sensitive)
- [ ] PR reviewed and approved (if team workflow)

## Rollback Plan

For destructive changes:
- [ ] Rollback procedure documented
- [ ] Data migration reversible
- [ ] Fallback strategy defined

## Post-Deployment Verification

After deployment:
- [ ] Health endpoint responding
- [ ] Smoke tests pass
- [ ] Metrics/logs showing normal behavior
- [ ] No error spikes in monitoring

## Common Mistakes to Avoid

- ❌ Forgetting to run migrations locally before committing
- ❌ Not testing the full user flow end-to-end
- ❌ Leaving console.logs or debug code
- ❌ Not updating tests when changing behavior
- ❌ Breaking deterministic replay with non-deterministic code
- ❌ Not considering cache invalidation
- ❌ Skipping type checking or linting
- ❌ Not documenting breaking changes