# Task Checklist
Date: 2025-09-29
Source: Derived from implementation_plan.md and architecture.md

Legend: [ ] Todo | [~] In Progress | [x] Done | [!] Blocked

## Phase Overview
[ ] Phase 0: Bootstrap & Instrumentation
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
[ ] CI green on clean clone
[x] Health endpoint accessible
[ ] Migration run + rollback test passes

---
## Phase 1: Semantics + Non-Concatenative + Validation Extensions
### Semantics Core
[ ] Migrations: semantic_frames, lexeme_senses, sense_relations, idioms, classifier_systems
[ ] CRUD services (frames, senses, idioms)
[ ] Event emission (CREATE/UPDATE/DELETE)
[ ] FrameBuilder UI (MVP)
[ ] Sense network data adaptor (graph extraction)
[ ] Validator: orphan sense detection
[ ] Validator: incomplete role filling in sample generations
### Non-Concatenative Morphology
[ ] Migrations: roots, patterns, root_pattern_bindings, reduplication_templates, ablaut_schemes
[ ] Root & pattern CRUD services
[ ] Pattern legality validator (slot vs skeleton length)
[ ] Binding generator (initial synchronous version)
[ ] Cache invalidation map (root, pattern, binding)
[ ] RootPatternBuilder UI (MVP)
[ ] Reduplication template specification (v1 constraints)
[ ] Ablaut scheme registry
### Validation Extensions
[ ] Tone association integrity validator
[ ] Orthography round-trip validator
[ ] Pattern completeness validator (required pattern sets)
[ ] Integrate all new validators into QA panel
### Metrics Scaffolding (Early)
[ ] Metrics snapshot schema (skeleton)
[ ] Cluster complexity draft function
### Wizard Update
[ ] Insert Semantics step (placeholder)
### Testing
[ ] Property tests: pattern legality, role coverage
[ ] Replay determinism test (250+ semantic/pattern events)
### Performance Baseline
[ ] Measure stem generation p95 (<1.5s target sample batch)
### Exit Validation
[ ] Validators visible with pass/fail states
[ ] Deterministic replay hash stable across 3 runs

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

