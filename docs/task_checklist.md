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
[ ] Phase 5: Security Hardening, Deterministic Replay, Benchmarks

---
## Phase 0: Bootstrap & Instrumentation
### Repo & CI
[x] Configure linting + formatting (ESLint, Prettier)
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
[ ] Migrations: contact_events, loan_rulesets, style_policies, code_switch_profiles
[ ] Intake endpoint (donor form + metadata)
[ ] Adaptation rule subset executor
[ ] Morphological integration classifier
[ ] Loan flag + trace persistence
[ ] BorrowingWizard UI (staged)
### Variant Overlays
[ ] Overlay diff engine
[ ] Conflict detection & explanation generator
[ ] VariantOverlayDiff UI
### Register & Style
[ ] Style policy evaluator
[ ] Register Audit Panel UI
### Metrics v1
[ ] Migrations: usage_stats, complexity_snapshots, metrics_jobs
[ ] Job scheduler + debounce logic
[ ] Calculators: articulatory load, homophony density, cluster complexity
[ ] Metrics API (latest + history)
[ ] MetricsDashboard v1
### Testing
[ ] Loan adaptation completeness tests
[ ] Metrics idempotence test (hash unchanged)
[ ] Overlay conflict synthetic cases
### Exit Validation
[ ] Borrowing pipeline p95 < 2s (small dataset)
[ ] Metrics snapshot visible; repeated trigger no duplicate snapshot

---
## Phase 3: Diachrony Evolution + Metrics Expansion
### Diachrony Extensions
[ ] Migrations: lexical_change_logs, semantic_shift_logs
[ ] Evolution batch job (dry-run + apply)
[ ] Change provenance trace writer
[ ] Innovation tracking flags
[ ] EvolutionTimeline UI
### Semantic Drift
[ ] Shift taxonomy enforcement
[ ] Drift heatmap aggregation service
### Metrics Expansion
[ ] Ambiguity metric (branching factor capture)
[ ] Morphological opacity metric
[ ] Processing load metric
[ ] Advisory suggestions generation (optional)
### Testing
[ ] Evolution determinism (seeded RNG)
[ ] Metrics expansion formula unit tests
[ ] Timeline ordering tests
### Exit Validation
[ ] Evolution job (100 lexemes) <5m
[ ] Replay unchanged earlier outputs
[ ] Advisory panel visible (if enabled)

---
## Phase 4: Optimization, Collaboration, Rule Graph
### Profiling & WASM
[ ] Benchmark harness (baseline stored)
[ ] Rewrite engine profiling run
[ ] Hotspot decision (>=10% CPU?)
[ ] WASM rewrite prototype (if justified)
[ ] WASM pattern expansion (if justified)
[ ] Fallback logic (capability detection)
### Collaboration (Y.js)
[ ] Room ID mapping strategy
[ ] Presence indicators (cursors/edit markers)
[ ] Conflict resolution test (simultaneous edits)
### Rule Dependency Graph
[ ] Migrations: rule_dependencies
[ ] Insertion guard + cycle detection
[ ] Diagnostics (cycle, shadowing, dead, unreachable)
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

## Progress Tracking Table (Template)
Task | Owner | Phase | Status | ETA | Risk | Notes
---- | ----- | ----- | ------ | --- | ---- | -----

---
End of checklist.

