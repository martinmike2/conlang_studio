# Task Checklist
Date: 2025-09-29
Source: Derived from implementation_plan.md and architecture.md

Legend: [ ] Todo | [~] In Progress | [x] Done | [!] Blocked

## Phase Overview
[x] Phase 0: Bootstrap & Instrumentation
[ ] Phase 1: Semantics + Non-Concatenative Foundations + Validation Extensions
[ ] Phase 2: Sociolinguistics, Borrowing, Initial Metrics
[ ] Phase 3: Diachrony Evolution + Metrics Expansion
[ ] Phase 4: Optimization, Collaboration, Rule Graph
[x] Ambiguity metric (branching factor capture)
[x] Morphological opacity metric
[x] Processing load metric
## Phase 0: Bootstrap & Instrumentation
### Repo & CI
[x] Metrics expansion formula unit tests
[x] Add type check pipeline
[x] Add test runner scaffold + sample test
[x] PR template with “Architecture Impact” section
[x] Health endpoint returning build SHA
### Migrations Framework
[x] Select migration tool (Drizzle)
[x] Write migration naming convention doc
[x] Add dry-run script
### Observability Foundations
[x] Structured logger (request + job correlation IDs)
[x] Basic metrics registry stub (histogram + counter placeholders)
[x] Job lifecycle event schema
### Synthetic Dataset Generator
[x] Baseline skeleton script
### Exit Validation
[x] CI green on clean clone
[x] Health endpoint accessible
[x] Migration run + rollback test passes

---
## Phase 1: Semantics + Non-Concatenative + Validation Extensions
### Semantics Core
[x] Migrations: semantic_frames, lexeme_senses, sense_relations, idioms, classifier_systems
[x] CRUD services (frames, senses, idioms)
[x] Event emission (CREATE/UPDATE/DELETE)
[x] FrameBuilder UI (MVP)
[x] Sense network UI (MVP)
[x] Sense network data adaptor (graph extraction)
[x] Validator: orphan sense detection
[x] Validator: incomplete role filling in sample generations
### Non-Concatenative Morphology
[x] Migrations: roots, patterns, root_pattern_bindings, reduplication_templates, ablaut_schemes
[x] Root & pattern CRUD services
[x] Pattern legality validator (slot vs skeleton length)
[x] Binding generator (initial synchronous version)
[x] Cache invalidation map (root, pattern, binding)
[x] RootPatternBuilder UI (MVP)
[x] Reduplication template specification (v1 constraints)
[x] Ablaut scheme registry
### Validation Extensions
[x] Tone association integrity validator
[x] Orthography round-trip validator
[x] Pattern completeness validator (required pattern sets)
[x] Integrate all new validators into QA panel
### Metrics Scaffolding (Early)
[x] Metrics snapshot schema (skeleton)
[x] Cluster complexity draft function
### Wizard Update
[x] Insert Semantics step (placeholder)

Notes: Added a lightweight wizard UI and route; files added: `apps/web/lib/ui/WizardStepper.tsx`, `apps/web/app/wizard/page.tsx`. Nav link added in `AppShell.tsx`.
### Testing
[x] Property tests: short-run smoke variants (pattern legality, role coverage)
[x] Property tests: long-run nightly suites (pattern legality, role coverage)
[x] Replay determinism test (250+ semantic/pattern events)
### Performance Baseline
[x] Measure stem generation p95 (<1.5s target sample batch) — measured p50≈0.01ms p95≈0.01ms p99≈0.03ms over 1,000 runs (total ~18.15ms)
### Exit Validation
[x] Validators visible with pass/fail states — Validators panel and API implemented (feature-flagged; set FEATURE_VALIDATORS_PANEL=true to enable)
[x] Deterministic replay hash stable across 3 runs — updated test to replay 3 independent runs and assert identical canonical snapshot hashes (run locally with NIGHTLY=true).

Notes: Verified locally by running NIGHTLY=true pnpm --filter testkits test -- tests/replay.determinism.test.ts — test suite completed with 19 files passed, 1 skipped; 41 tests passed, 1 skipped. Duration ~64s on local devbox.

---
## Phase 2: Sociolinguistics, Borrowing, Initial Metrics
### Borrowing Pipeline
[x] Migrations: contact_events, loan_rulesets, style_policies, code_switch_profiles
[x] Intake endpoint (donor form + metadata)
[x] Adaptation rule subset executor
[x] Morphological integration classifier
[x] Loan flag + trace persistence
	- Plan: implement a lightweight "loan flag" that marks candidate borrowings with provenance and acceptance state, and persist a trace of decisions (rules applied, classifier candidate chosen, timestamps, actor).
	- Steps:
		1. Add DB migration for loan_flags (id, contactEventId, candidateRootId?, candidatePatternId?, accepted boolean, reason text, meta jsonb, createdAt).
		2. Implement service methods: createLoanFlag(contactEventId, payload), listLoanFlags(filter), acceptLoanFlag(flagId, actorId) (which writes usage_stats increment as optional follow-up).
		3. Wire the intake/borrowing pipeline to optionally emit a loan_flag record when a candidate is proposed/accepted.
		4. Add API route for accepting/rejecting flags and for retrieving traces for audit/debug.
		5. Add tests: DB migration + service + API integration tests.
	- Acceptance criteria:
		- DB migration applied and reversible in tests.
		- Service CRUD operations covered by unit tests.
		- API route persists loan flag and accept/reject updates acceptance state and records actor/timestamp.
		- At least one integration test showing a contact event -> proposed candidate -> accept flag -> usage_stats increment (optional, can be a follow-up if write-path is deferred).
[x] BorrowingWizard UI (staged)
	- Plan: scaffold a small multi-step BorrowingWizard page in the web app that allows entering donor data, previewing classifier candidates, creating loan flags, and accepting/rejecting proposals. Start with a basic form that posts to the intake API and a list view that fetches loan flags.
	- Acceptance criteria:
		- A new page exists at `/borrowing/wizard` with a working intake form that calls the `/api/borrowing/intake` route and shows the created contact event response.
		- A stubbed UI section lists loan flags by calling the `/api/borrowing/flags` endpoints (POST/PUT available) and shows create/accept flows.
		- Basic client-side validation and minimal styling (uses existing globals.css).
		- Unit or integration test for the intake form submit flow (optional follow-up if end-to-end wiring is complex).
### Variant Overlays
[x] Overlay diff engine
		- [x] Core engine: implement applyOverlay(base, ops) with conflict detection and deterministic results
			- Files: `packages/core/overlays/service.ts`
			- Tests: `packages/testkits/tests/overlay.service.test.ts` now cover add/update/remove, duplicate detection, ordering, large arrays, and `explainConflict`
		- [x] Persistence API: create/list/get overlays (DB-backed)
			- Files: `packages/core/overlays/service.ts`, `apps/web/app/api/overlays/route.ts`, `packages/db/schema/core.ts`
			- Tasks completed:
				- `createOverlay` rejects malformed ops before insert
				- `listOverlays` awaits the query and returns rows
				- Migrations `0010`–`0012` persist table, indexes, and unique constraint; harness updated
			- Tests: DB-backed integration + concurrency coverage in `packages/testkits/tests/overlay.persistence.test.ts` and `overlay.edgecases.test.ts`
		- [x] DB constraints & indexes
			- Files: `packages/db/migrations/0011_variant_overlays_created_at_index.sql`, `0012_variant_overlays_language_name_unique.sql`, schema wired in `packages/db/schema/core.ts`
		- [x] Dev experience: opt-in dev fallback behind `OVERLAYS_DEV_FALLBACK=true`; default path hits Postgres and fails fast otherwise

[x] Conflict detection & explanation generator
		- [x] Structured conflicts emitted as `{ opIndex, reason, op }` and surfaced via `explainConflict`
			- Files: `packages/core/overlays/service.ts`
			- Tests: see `packages/testkits/tests/overlay.service.test.ts` for conflict enumeration cases
		- [x] UI renders conflicts inline with per-conflict Skip action (`VariantOverlayDiff`)

[x] VariantOverlayDiff UI
		- [x] UX polish: Apply in-memory, inline conflicts + Skip, save naming dialog with Snackbars, clear action, stored-overlay list w/ Apply
			- Files: `apps/web/lib/ui/VariantOverlayDiff.tsx`, `apps/web/app/overlays/diff/page.tsx`
		- [x] E2E Playwright test exercising Apply → Save → Load → Apply
			- Tests: `packages/testkits/e2e/overlay.spec.ts` + config and README

Priority & acceptance criteria (concise):
- Priority A (must) — ✅ satisfied. Engine correctness verified via unit tests, API-side validation enforced, persistence wired to Postgres with integration coverage (`overlay.persistence.test.ts`, `overlay.edgecases.test.ts`).
- Priority B — ✅ satisfied. Dedicated migrations for indexes/uniques applied (`0011`, `0012`), concurrency + large payload tests added, dev fallback explicitly opt-in.
- Priority C — ✅ satisfied. Conflict UI includes skip workflow, Playwright E2E covers Apply → Save → Load → Apply. Auth hardening + perf tuning tracked as future enhancements in Phase 3 security/perf tracks.

Quick next steps (for immediate work):
- Seed sample style policies for demo environments and document JSON authoring patterns in `docs/style_policies.md`.
- Extend the audit evaluation output into the Validators panel (surface pass/fail status alongside other QA checks).
- Add targeted Playwright coverage for the Register Audit panel once auth + fixtures stabilize.

Risk/edge-cases to cover in tests:
- malformed ops (missing action/fields) should return 400 and not persist
- large ops arrays (10k+) may need batching or optimization
- dev-module reloads make in-memory fallback inconsistent—avoid relying on it for tests

### Register & Style
[x] Style policy evaluator — `@core/register` service parses `style_policies` JSON rules, evaluates samples, and exposes API endpoints.
[x] Register Audit Panel UI — `/register` page surfaces policy summaries, sample composer, and result viewer.
### Metrics v1
 [x] (note) initial borrowing regex-safety counters added to core metrics registry
[x] Migrations: usage_stats, complexity_snapshots, metrics_jobs
[x] Job scheduler + debounce logic
[x] Calculators: articulatory load, homophony density, cluster complexity
[x] Metrics API (latest + history)
[x] MetricsDashboard v1
### Testing
 [x] Loan adaptation completeness tests
 [x] Metrics idempotence test (hash unchanged)
 [x] Overlay conflict synthetic cases
### Exit Validation
 [x] Borrowing pipeline p95 < 2s (small dataset)
 [x] Metrics snapshot visible; repeated trigger no duplicate snapshot

---
## Phase 3: Diachrony Evolution + Metrics Expansion
### Diachrony Extensions
[x] Migrations: lexical_change_logs, semantic_shift_logs
[x] Evolution batch job (dry-run + apply)
[x] Change provenance trace writer
[x] Innovation tracking flags
[x] EvolutionTimeline UI
### Semantic Drift
[x] Shift taxonomy enforcement
[x] Drift heatmap aggregation service
### Metrics Expansion
 [x] Ambiguity metric (branching factor capture)
 [x] Morphological opacity metric
 [x] Processing load metric
### Testing
[x] Evolution determinism (seeded RNG)
[x] Metrics expansion formula unit tests
[x] Timeline ordering tests
### Exit Validation
[~] Evolution job (100 lexemes) <5m
[x] Replay unchanged earlier outputs
[ ] Advisory panel visible (if enabled)

Notes:
- scripts/validate-phase3-evolution.ts added — performs a 100-lexeme dry-run timing of `executeEvolutionBatch` (dry-run mode) and fails if >5 minutes. Currently the script uses mocked lexeme fetches because `fetchAllLexemeIds`/full lexeme seeding is TODO in the diachrony service; this is why the item is marked In Progress rather than Done.
- Nightly CI job `nightly-evolution-validation` added to `.github/workflows/ci.yml` to run the evolution validation script and to run the replay determinism test with `NIGHTLY=true`. The determinism test invocation was adjusted to call `vitest` directly to avoid package-script flag conflicts.
- Replay determinism test: added to nightly CI and verified locally (ran `NIGHTLY=true pnpm --filter testkits exec -- vitest run tests/replay.determinism.test.ts` — PASS). The CI job will run on GitHub once changes are pushed.

---
## Phase 4: Optimization, Collaboration, Rule Graph
### Profiling & WASM
[x] Benchmark harness (baseline stored)
	- Harness: `scripts/benchmarks/phase4/run-benchmark.ts`
	- Baseline artifact: `benchmarks/phase4/baseline.json` (written by the harness)
[x] Rewrite engine profiling run
[x] Hotspot decision (>=10% CPU?)
[ ] WASM rewrite prototype (if justified)
[ ] WASM pattern expansion (if justified)
[ ] Fallback logic (capability detection)

Note: full worker profiling runs were executed (1k and 5k lexemes) and processed profiles written to `benchmarks/phase4/` — see `benchmarks/phase4/isolate-*-v8.log.processed.txt` and `benchmarks/phase4/worker-regeneration-baseline.json` for artifacts.
### Collaboration (Y.js)
[ ] Room ID mapping strategy
[ ] Presence indicators (cursors/edit markers)
[ ] Conflict resolution test (simultaneous edits)
### Rule Dependency Graph
[x] Migrations: rule_dependencies
[x] Insertion guard + cycle detection
[~] Diagnostics (cycle, shadowing, dead, unreachable) — cycle detection done; shadowing/dead rule detection TODO
[ ] RuleDependencyGraph UI
### Cache & Performance
[ ] Add frame_index_cache
[ ] Add derivation_trace_cache
[ ] Enforce invalidation matrix
### Testing
[ ] Cycle prevention test matrix
[ ] Performance regression guard
### Exit Validation
[ ] p95 rewrite latency improved ≥30% OR documented exception
[ ] Collaboration convergence <500ms avg
[ ] Cycle insertion blocked correctly

### Phase 4 Plan (PR-sized tasks)
These are small, reviewable PRs that implement Phase 4 incrementally. Mark each PR as [~] in progress and [x] when merged.

 - [x] PR-000: Instrumentation & benchmark harness
	 - Add reproducible harness under `scripts/benchmarks/phase4/` and baseline artifact `benchmarks/phase4/baseline.json`.
	 - Acceptance: harness runs locally and produces baseline.json; CI job (optional) can run the harness.
	 - Note: harness & baseline artifacts present (see `benchmarks/phase4/` and `docs/phase4/profiling_findings.md`).

 - [x] PR-001: Profiling & hotspot analysis
	 - Run harness, produce `docs/phase4/profiling_findings.md` with hotspots and decision (WASM? optimize JS?).
	 - Acceptance: findings doc committed and engineering decision recorded.
	 - Note: `docs/phase4/profiling_findings.md` exists and describes persistence experiments and hotspots.

 - [x] PR-002: Collaboration frontend (Y.js integration)
 	 - Add lightweight Y.js client integration and `useCollab` hook plus `CollabProvider` component.
 	 - Acceptance: two-browser Playwright smoke showing basic presence/edits; unit tests for hook behavior.
 	 - Status: ✅ **COMPLETE** - Full Y.js integration with presence indicators and backend persistence
 	 - Implementation:
 	   - Y.js dynamic import with WebSocket provider
 	   - API persistence provider bridging to collab_events backend
 	   - PresenceIndicators component with Material-UI
 	   - Enhanced test page with mock and real modes
 	   - Unit tests: 5 tests for mock doc behavior
 	   - E2E tests: 2 tests (mock mode passing, real mode requires services)
 	   - BroadcastChannel fallback for development
 	 - Files: See `docs/phase4/PR-002-collab-frontend-summary.md` for details

 - [x] PR-003: Collaboration backend & persistence (DB/migrations)
	 - Add collab_events/session tables, migrations, and append-only API endpoints under `apps/web/app/api/collab/`.
	 - Acceptance: events persisted and retrievable in order; integration tests for append/read.
	 - Status: ✅ **COMPLETE** - Full implementation with 43 passing tests
	 - Implementation:
	   - DB migrations and schema (0015_collab_events.sql)
	   - Service layer with transaction-safe server_seq generation
	   - Zod validation schemas (collabTypes.ts)
	   - API endpoints: sessions (POST/GET), events (POST/GET)
	   - Comprehensive tests: 22 service tests + 21 API tests
	   - Concurrency-safe event appending with transaction isolation
	   - Session lifecycle management with cascade deletes
	 - Files: See `docs/phase4/PR-003-collab-backend-summary.md` for details

 - [x] PR-004: Rule dependency graph backend
	 - Implement graph computation service returning nodes/edges JSON and a cached API.
	 - Acceptance: unit tests for graph generation and an API endpoint returning expected structure for sample rules.
	 - Status: ✅ **COMPLETE** - Full implementation with graph computation, caching, and comprehensive tests
	 - Implementation:
	   - DB migration 0016_rule_dependencies.sql with proper indexes
	   - Schema update with ruleDependencies table
	   - Graph computation service supporting loan_rule, style_policy_rule, variant_overlay_op
	   - Implicit dependency computation (priority-based for loan rules)
	   - Cycle detection, reachability analysis, diagnostics
	   - API endpoint GET /api/languages/[id]/rule-graph with query params
	   - In-memory cache with 5-minute TTL
	   - Unit tests: 13 test cases covering computation, caching, diagnostics
	   - Integration tests: 10 test cases for API validation
	   - TODO: Add phon_rule, phonotactic_rule, syntax_rule support
	   - TODO: Implement shadowed/dead rule detection
	 - Files: See `docs/phase4/PR-004-rule-graph-backend-summary.md` for details

 - [ ] PR-005: Rule dependency graph UI
	 - Add `RuleGraph` viewer component (suggest `react-flow`) with search/navigation and node->editor linking.
	 - Acceptance: Playwright smoke that opens graph, searches a node, and navigates to editor.
	 - Status: Not found in repo; to be implemented.

 - [ ] PR-006-proto: WASM prototype (conditional)
	 - Prototype hot-path in WASM (Rust/AssemblyScript) and microbenchmarks against JS baseline.
	 - Acceptance: demonstrable hotspot speedup and parity tests for correctness.
	 - Status: Not found in repo; conditional on profiling decision.

 - [ ] PR-007: WASM integration & rollout (if PR-006 accepted)
	 - Integrate WASM module with JS fallback and CI build steps for WASM artifact.
	 - Acceptance: CI builds include WASM, tests pass, and performance benchmark shows improvement.
	 - Status: Not started.

 - [~] PR-008: CI & optional benchmark job
	 - Add optional `phase4:bench` CI job to run harness and upload artifacts to CI artifacts.
	 - Acceptance: job runs manually and uploads artifacts; does not block merges unless explicitly enabled.
	 - Status: CI job stub referenced in docs; concrete workflow not found.

 - [x/~] PR-009: Docs & runbooks (profiling findings present)
	 - Add `docs/phase4/README.md` with run instructions, migration notes, and decision log.
	 - Acceptance: docs added and linked from `docs/task_checklist.md`.
	 - Note: `docs/phase4/profiling_findings.md` exists (profiling findings); a consolidated `docs/phase4/README.md` runbook is recommended.

Use these PRs as checklist items for Phase 4 progress tracking and to satisfy the Phase Quality Gates above.

### Phase 4 decision: persistence strategy

- Decision: UNNEST-based bulk insert + controlled concurrency is the preferred persistence path for full regeneration runs.
- Rationale: Profiling (1k and 5k runs) shows `paradigm.persist` dominates end-to-end time; UNNEST+concurrency produced the best throughput in local experiments versus multi-insert and COPY for the tested batch sizes.
- Consequence: Defer WASM rewrite for compute-heavy functions unless a future profiling run shows a compute hotspot (>10% of total CPU/time). Focus next efforts on:
	- tuning `batchSize` and `concurrency` in `packages/core/morphology/recomputeWorker.ts`;
	- adding an optional COPY fallback for very large batches (where COPY is competitive); and
	- implementing incremental recompute (event-driven `processInvalidation`) to avoid full rebuilds where possible.
- Artifacts: see `benchmarks/phase4/*` (regeneration baselines, processed V8 logs) and `packages/core/morphology/recomputeWorker.ts` for UNNEST/COPY implementation.

### Persistence tuning status

- [x] Apply tuned defaults (UNNEST, batchSize=500, concurrency=4) to `runFullRecompute` — done.
- [x] Add COPY fallback for very large batches (threshold=2000) — done.
- Evidence: sweep results at `benchmarks/phase4/sweep-results.json` and a verification run wrote `benchmarks/phase4/worker-regeneration-baseline.json` (persistMs ~1269ms).

---
## Phase 5: Security, Replay Gate, Benchmarks
### Security & Roles
[ ] Migrations: language_members, security_events
[ ] Access control middleware (role matrix)
[ ] Audit event coverage (CRUD, export, metrics)
[ ] Rate limiting (borrowing, metrics recompute)
### Replay Determinism
[ ] Replay harness (snapshot→hash)
[ ] CI gate integration
[ ] Seeded RNG & stable sort enforcement
### Governance & Compliance
[ ] ACP template enforcement
[ ] Threat model document
[ ] Export scrubbing policy
### Performance Benchmarks
[ ] Paradigm generation benchmark trend
[ ] Borrowing pipeline benchmark trend
[ ] Evolution job benchmark trend
### Documentation & Finalization
[ ] Architecture conformance report update
[ ] SLO attainment summary
### Testing
[ ] Unauthorized access test matrix
[ ] Replay flakiness soak (10-run stability)
### Exit Validation
[ ] All SLOs green or accepted
[ ] Replay gate green 5 consecutive runs

---
## Phase 999: Optional Improvements
### FrameBuilder Enhancements
[ ] Scope-aware activity feed (frame-specific filtering)
[ ] Auto-select newly created frame in builder
[ ] Unsaved changes indicator
[ ] Keyboard shortcuts (save, new frame, navigation)

### Activity & Context Extras
[ ] Inline role validation with duplicate hints
[ ] Enhanced empty states with guided CTAs
[ ] Frame list search and domain filter
[ ] Related senses preview in sidebar

### Quality-of-Life
[ ] Skeleton loaders for list panels
[ ] Toggle to widen activity panel
[ ] Hotkey reference popover
[ ] Richer Metrics Dashboard: sparklines, historical charts, tooltips, and per-metric explanations

### CI & Reliability additions
[ ] Add CI artifact upload in the nightly workflow to persist snapshot.json + snapshot.hash for historical tracing
[ ] Run a soak (e.g., 5–10 consecutive replays in CI) for extra confidence and add a CI gate if desired
[ ] Implement artifact upload to GitHub Actions and a small hydration script to compare historical hashes

### Sense Network Enhancements
[ ] Relation-aware color palette for graph edges and nodes
[ ] Node pinning / focus mode in graph view

---
## Cross-Cutting Continuous Tasks
[ ] Coverage thresholds progression (60% → 75% → 85%)
[ ] Update QA panel on new validators
[ ] Maintain synthetic datasets (small/medium/large)
[ ] Weekly risk register update
[ ] Record benchmark deltas per optimization

## Quality Gates Template (Per Phase)
[ ] Build & Lint PASS
[ ] Typecheck PASS
[ ] Unit tests PASS (coverage target)
[ ] Property tests PASS
[ ] Replay determinism PASS (Phase ≥1)
[ ] Performance snapshot archived
[ ] Docs updated (architecture delta + implementation sync)
[ ] Open critical bugs: 0

## Artifact Creation Checklist
[ ] metrics_spec.md (end Phase 1)
[ ] engine_determinism_contract.md (Phase 2)
[ ] delta_architecture_diagram.md (post Phase 2)
[ ] threat_model.md (start Phase 5)
[ ] benchmark_reports/ (Phase 4+)

## Risk Monitoring (Weekly)
[ ] Schema churn > planned? (count)
[ ] Replay hash variance? (incidents)
[ ] Metrics job backlog size acceptable?
[ ] Evolution job duration within budget?
[ ] Access control regressions?

## Story Readiness (Definition of Ready)
[ ] Acceptance criteria documented
[ ] Test outline present
[ ] Migration impact assessed
[ ] Observability hooks noted
[ ] Dependencies unblocked
[ ] Rollback plan (if destructive)

## Story Completion (Definition of Done)
[ ] Code merged
[ ] Tests added & green
[ ] Docs updated
[ ] Telemetry verified
[ ] Replay integrity unaffected
[ ] No high-severity issues open
[ ] Benchmarks updated (if performance-sensitive)

## Near-Term (Phase 1 Sprint 1 Extract)
[ ] S1 Semantics migrations
[ ] S5 Root/pattern migrations
[ ] S2 Frame CRUD service
[ ] S6 Pattern legality validator
[ ] S12 Metrics snapshot skeleton
[ ] S13 Cluster complexity draft calc
[ ] FrameBuilder UI prototype
[ ] RootPatternBuilder UI prototype
[ ] QA panel integration (new validators)
[ ] Replay determinism harness kickoff

## Optional Fast-Follow Enhancements (Flagged)
[ ] Advisory suggestions table
[ ] Code-switch profiles UI
[ ] Advanced reduplication/ablaut visualization
[ ] Advisory suggestions generation (optional)

## Progress Tracking Table (Template)
Task | Owner | Phase | Status | ETA | Risk | Notes
---- | ----- | ----- | ------ | --- | ---- | -----

---
End of checklist.

## Developer notes: reducing Vitest CPU usage

If Vitest consumes too much CPU on your machine, the `testkits` package runs Vitest with conservative defaults that limit parallelism:

- `pnpm --filter testkits test` runs Vitest with `--max-workers=2 --threads=false`.

To run with different settings temporarily, call Vitest directly (for example to use more workers):

```bash
# run with 4 worker processes and enable threads
pnpm --filter testkits exec -- vitest run --max-workers=4 --threads=true
```

Or set the `TESTKIT_VITEST_FLAGS` environment variable in your shell to pass custom flags in CI or on your dev machine.

If CI requires full parallelism, adjust the package script in `packages/testkits/package.json` or run Vitest without the flags there.

