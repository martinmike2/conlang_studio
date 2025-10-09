Playwright E2E tests for VariantOverlayDiff.

Run locally:

1. Start Playwright (this will start web dev with OVERLAYS_DEV_FALLBACK=true):

```bash
pnpm --filter testkits run e2e
```

Note: tests rely on the in-memory overlays dev fallback. For a production-like run, start Postgres and migrations first.
# Testkits — Property test notes

This package contains test harnesses and property-style tests used for validating morphology and semantics validators.

Two test modes are provided:

- Short-run smoke tests (fast, suitable for PRs / CI)
  - Files: `tests/validation.patterns.short.test.ts`, `tests/validation.semantics.short.test.ts`
  - These run by default in CI and locally and are intentionally small.

- Long-run property suites (extensive, nightly)
  - Files: `tests/validation.patterns.property.test.ts`, `tests/validation.semantics.property.test.ts`
  - These tests are long-running and are gated by an environment variable. They will be skipped unless `NIGHTLY=true` (or `NIGHTLY=1`) is set.

Why this split
- Long property tests are valuable but expensive. Keeping a short smoke variant that runs on PRs keeps feedback fast while still allowing thorough nightly verification.

How to run

- Run the short smoke tests (default):

```bash
pnpm --filter ./packages/testkits test
```

- Run the long nightly suites locally:

```bash
# run the entire workspace tests with NIGHTLY enabled
NIGHTLY=1 pnpm -w test

# or run only the package tests with NIGHTLY enabled
NIGHTLY=1 pnpm --filter ./packages/testkits test
```

CI

A GitHub Actions workflow was added at `.github/workflows/nightly-property-tests.yml` that runs daily and on manual dispatch. It sets `NIGHTLY=true` before invoking `pnpm -w test`, which causes the long property suites to execute.

Notes

- The property tests use a deterministic PRNG so runs are reproducible (fixed seeds in the test files).
- If you want a faster-nightly variant for a particular CI runner, reduce the iterations in the property test files or add a separate `NIGHTLY_LEVEL` env var to control iterations.

If you'd like, I can:
- Open a PR with these changes (tests + checklist + workflow + README), or
- Add a `README.md` entry pointing to a short-run vs nightly section in the repo root docs.
