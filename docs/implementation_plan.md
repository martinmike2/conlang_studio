# Implementation Plan (Q4 2025 Kickoff)

## 0. Task & Scope Recap
Goal: Deliver the Conlang Studio per updated architecture, closing all framework-alignment gaps (semantics depth, sociolinguistics & borrowing, psycholinguistic metrics, diachrony lexical/semantic change, non‑concatenative morphology, validation breadth, security, performance, rule dependency governance).

Primary Success Metrics:
- Functional Coverage: 100% of required modules (Phonology, Morphology, Syntax, Semantics, Orthography, Lexicon, Sociolinguistics, Diachrony, Metrics, Export, Validation) available in Expert Mode; ≥80% Wizard coverage.
- Stability: <2% failed derivation operations across regression corpus after Phase 3.
- Performance: Paradigm regeneration p95 < 2.0s for medium language (5K lexemes) by end Phase 4.
- Collaboration: Deterministic replay acceptance gate green 100% by end Phase 5.

## 1. Guiding Principles
1. Incremental vertical slices: deliver end‑to‑end thin features (schema + engine + UI) rather than isolated layers.
2. Determinism first: any engine addition must include replay compatibility tests.
3. Explicit validation surface: all new rules/structures must register validators + property tests early.
4. Cost containment: add WASM only after profiling proves hotspot (≥10% total CPU).
5. Observability: every background job logs structured lifecycle events.
6. Roll-forward bias: prefer additive migrations + deprecation windows over destructive changes.

## 2. Phase Breakdown Overview
| Phase | Focus | Duration (est) | Exit Gate |
|-------|-------|----------------|-----------|
| 0 | Bootstrap & Instrumentation | 1 week | Environments + baseline CI green |
| 1 | Semantics Core + Non-Concat Foundations + Validation Extensions | 4 weeks | All Phase 1 AC met |
| 2 | Sociolinguistics & Borrowing + Initial Metrics | 4 weeks | Borrowing E2E + metrics v1 |
| 3 | Diachrony Lexical/Semantic Evolution + Metrics Expansion | 4 weeks | Evolution timeline + metrics suite |
| 4 | Optimization (WASM), Collaboration, Rule Graph UI | 4 weeks | p95 targets + collab MVP |
| 5 | Security Hardening, Deterministic Replay Gate, Performance Benchmarks | 3 weeks | Governance checklists active |

## 3. Detailed Phase Plans
### Phase 0: Bootstrap & Instrumentation
Scope:
- Repo tooling (lint, format, test, build pipelines)
- Baseline schema (core pre-existing + migrations mechanism)
- Observability baseline (structured logger, request tracing, job metrics skeleton)
Deliverables:
- CI pipeline (lint, typecheck placeholder, test stub)
- Migration runner + naming convention doc
Acceptance Criteria (AC):
- Pull request template includes Architecture Impact section
- Health endpoint returns build SHA
Risks: Over-tooling; Mitigation: 2-day timebox.

### Phase 1: Semantics + Non‑Concatenative + Validation Extensions
Scope:
- Semantics tables: frames, senses, relations, idioms, classifier systems
- Non‑concatenative entities: roots, patterns, bindings, reduplication templates, ablaut schemes
- Pattern compilation cache logic contract (interface only if engines not yet fully optimized)
- Validation additions: tone, orthographic round-trip, semantic role coverage, pattern completeness
- Wizard updates to include Semantics step stub
Deliverables:
- Migrations for new tables (idempotent forward/backwards plan)
- Domain services: `SemanticsService`, `PatternService`
- UI: FrameBuilder (MVP), RootPatternBuilder (MVP)
- Test: property tests for pattern legality, role coverage test harness
AC:
- Create/update/delete for frames & senses persists & reflects in UI within <1s
- Generating stems for sample root set (<50 roots) completes <1.5s p95
- All new validators appear in QA panel with pass/fail state
Risks: Scope creep in semantics graph; Mitigation: restrict relation types v1 to fixed enum.
Exit Gate Validation:
- Replay of event log after 250+ mixed semantic/root events produces identical corpus hash

### Phase 2: Sociolinguistics, Borrowing Pipeline, Initial Metrics
Scope:
- Borrowing intake → adaptation → integration pipeline
- Variant overlay conflict detection engine
- Metrics v1: articulatory load, homophony density, cluster complexity
- Style/register policies + Register Audit Panel
Deliverables:
- BorrowingWizard (MVP) with progress stages
- MetricsDashboard (v1) with snapshot list & diff
- Background job: metrics recompute (debounced)
- Tests: loan adaptation completeness, metrics idempotence
AC:
- Borrowing pipeline transforms donor form and inserts lexeme with loan flag in <2s p95
- Metrics snapshot idempotent hash unchanged on null structural delta
- Conflict detection flags synthetic overlay collisions with human-readable explanation
Risks: Overhead of recompute; Mitigation: enforce debounce + manual recompute override only.
Exit Gate:
- 3 sample donor words processed with expected adaptation trace displayed.

### Phase 3: Diachrony Lexical/Semantic Evolution + Metrics Expansion
Scope:
- Lexical change logs, semantic shift logs
- Evolution timeline aggregation API + UI visualization
- Metrics expansion: morphological opacity, ambiguity (parse branching), processing load
Deliverables:
- EvolutionTimeline component
- Background batch job for lexical evolution simulation (dry-run + apply)
- Ambiguity collector hooking into derivation engine traces
- Extended metrics tests
AC:
- Evolution job (100 lexemes, 5 change rules) completes <5m and yields deterministic output on repeat
- Timeline groups events with accurate chronological ordering (unit tests)
- Ambiguity metric stable across two identical replays
Risks: Non-determinism from clock usage; Mitigation: deterministic seeded RNG for simulations.
Exit Gate:
- Regression suite shows unchanged prior-phase outputs (no unintended diffs).

### Phase 4: Optimization, Collaboration, Rule Graph UI
Scope:
- Profiling & WASM implantation for rewrite & pattern expansion (only if hotspot >10% CPU)
- Y.js integration for collaborative editing (select modules: rules, lexicon, frames)
- RuleDependencyGraph UI + cycle/diagnostic panel
Deliverables:
- Performance benchmark harness (baseline vs optimized)
- Collab session presence indicators
- Cycle detection incremental insertion logic
AC:
- p95 rule application latency reduced ≥30% vs baseline OR documented reason no WASM needed
- Concurrent edits (2 sessions) produce conflict-free merged state in <500ms propagation
- Cycle insertion test suite passes (blocks introduction of cycles)
Risks: Complexity of cross-tab collab; Mitigation: start with single module (phon_rules) before generalizing.
Exit Gate:
- Benchmarks stored & compared automatically in CI (trend chart artifact).

### Phase 5: Security Hardening, Deterministic Replay Gate, Performance Benchmarks
Scope:
- Membership roles enforcement across endpoints
- Audit event emission checks
- Deterministic replay CI gate (hash compare) mandatory
- Performance SLO dashboards (latency, job durations)
Deliverables:
- Access control middleware
- Replay harness producing reproducible hash artifact
- Benchmarks: paradigm generation, borrowing pipeline, evolution job
AC:
- Unauthorized access attempts return correct status & logged
- Replay hash stable across 10 consecutive re-runs on same snapshot
- All SLOs (p95 latencies) documented and green in final report
Risks: Replay flakiness; Mitigation: freeze nondeterministic sources (time, RNG, ordering) behind seed.
Exit Gate:
- Final architecture conformance review sign-off.

## 4. Cross-Cutting Workstreams
1. Data & Migrations: versioned, peer-reviewed, rollback scripts required.
2. Engines: test-first; every public function has determinism test where applicable.
3. UI/UX: design tokens & component patterns stabilized by end Phase 1.
4. Validation & QA: add new validations concurrently with feature (no retrospective backlog).
5. Observability: metrics & logs maturity levels target: Phase 2 (basic), Phase 5 (advanced).
6. Security: threat model produced at start Phase 5.

## 5. Backlog (Epics → Representative Stories)
E1 Semantics Core
- S1 Create semantics schema migrations
- S2 Frame CRUD service + events
- S3 Sense linking & orphan detection
- S4 Idiom pattern parser (minimal) + validation policy
E2 Non-Concat Morphology
- S5 Root/pattern model + binding generator
- S6 Pattern legality validator & cache invalidation rules
- S7 Reduplication template interpreter (MVP)
E3 Borrowing Pipeline
- S8 Donor intake form & server action
- S9 Adaptation rule subset executor
- S10 Morphological integration classifier
- S11 Loan audit trail UI panel
E4 Metrics Layer v1
- S12 Metrics snapshot model & job scheduler
- S13 Cluster complexity calculator
- S14 Homophony density calculator
E5 Variants & Overlay Conflicts
- S15 Overlay diff engine
- S16 Conflict detection logic & UI warnings
E6 Diachrony Evolution
- S17 Lexical change log persistence
- S18 Semantic shift log & shift taxonomy
- S19 Evolution simulation dry-run mode
E7 Metrics Expansion
- S20 Ambiguity capture from derivation traces
- S21 Morphological opacity metric
E8 Collaboration
- S22 Y.js room provisioning
- S23 Presence/awareness indicators
E9 Rule Graph
- S24 Dependency edge model + insertion guard
- S25 Cycle detection test suite
- S26 Rule graph visualization
E10 Performance & WASM
- S27 Benchmark harness
- S28 Rewrite engine profiling
- S29 WASM prototype & fallback strategy
E11 Security & Governance
- S30 Membership enforcement middleware
- S31 Audit event coverage tests
- S32 Replay determinism gate
E12 Exports & Reports Enhancements
- S33 Extended PDF semantics + metrics sections
- S34 Snapshot-linked export archive index

## 6. Prioritization Rationale
- Semantics & non-concat early to avoid schema churn after downstream features depend.
- Borrowing & metrics precede evolution to generate empirical baselines before transformation logic.
- Performance & collaboration deferred until functional foundation stable.

## 7. Definition of Ready (DoR)
A story enters sprint only if:
- Acceptance criteria written & test outline included
- Data model changes confirmed against migration checklist
- External dependencies (fonts, libs) approved
- Observability hooks planned

## 8. Definition of Done (DoD)
A story is Done when:
- Code + tests merged, all CI checks pass
- Determinism tests (if applicable) updated
- Documentation (module README or central docs) updated
- Telemetry (logs + metrics) present in non-prod environment
- No open high / medium severity issues tagged blocking

## 9. Migration Strategy
- Forward-only baseline; provide reversible companion script for destructive alterations within same phase.
- Phase bundling: release semantics + non-concat migrations together (atomic review). Later phases additive only.
- Migration dry-run env dataset with synthetic language objects.
- Migration verification checklist: counts, foreign key integrity, index presence, rollback viability (if declared reversible).

## 10. Testing Strategy Expansion
Matrix (artifact → test types):
- Rewrite rules: unit, property (no infinite loops), regression (golden derivations)
- Pattern engine: unit, property (pattern removal invalidates dependent stems only)
- Borrowing pipeline: integration (full path), property (every foreign segment either mapped or flagged)
- Metrics calculators: unit (formula accuracy), idempotence
- Evolution job: simulation determinism, performance (wall time threshold)
- Rule graph: cycle prevention, dead rule detection
- Security: role access matrix tests

Coverage Targets:
- Phase 1: ≥60% statements, critical path 100%
- Phase 3: ≥75% statements
- Phase 5: ≥85% statements, 100% of engine core modules

## 11. Observability Plan
Metrics (baseline list):
- engine_rewrite_duration_ms (histogram)
- paradigm_generation_duration_ms
- metrics_snapshot_duration_ms
- evolution_job_duration_ms
- rule_cycle_insert_attempts_total
- cache_hit_ratio (by cache type)
Logs: structured JSON (timestamp, event_type, entity_type, entity_id, correlation_id).
Tracing: optional in Phase 4 if hotspots unresolved.
Alerts: metrics job failure, replay hash mismatch, p95 rewrite > target.

## 12. Performance Budgets & SLOs
Initial Targets (refined after profiling):
- Rewrite application (single word, avg length 10 phonemes) p95 < 25ms
- Paradigm generation (single lexeme full paradigm) p95 < 120ms
- Borrowing pipeline end-to-end p95 < 2000ms
- Metrics snapshot (medium language) < 90s
- Evolution batch (100 lexemes) < 5m

## 13. Risk Register (Expanded)
| Risk | Phase | Impact | Likelihood | Mitigation | Trigger | Contingency |
|------|-------|--------|------------|-----------|---------|-------------|
| Semantics schema churn | 1 | High | Med | Early cross-review | Change requests >2 after merge | Freeze & defer additions |
| Borrowing complexity explosion | 2 | Med | Med | Reduced DSL scope | User demands complex adaptation | Introduce v2 DSL later |
| Metrics non-determinism | 2-3 | High | Low | Hash input state | Hash mismatch | Snapshot quarantine & diff |
| Evolution job slowness | 3 | High | Med | Profiling before features | Duration > target | Parallel chunking |
| WASM build pipeline friction | 4 | Med | Low | Prototype early | Build times >3m | Provide TS fallback default |
| Replay flakiness | 5 | High | Med | Seeded RNG & sorted iteration | Hash variance >0.5% runs | Block deploy & triage |
| Access control regression | 5 | High | Low | Role matrix tests | Unauthorized success | Auto rollback |

## 14. Rollout Strategy & Environments
Environments: Dev (feature branches) → Staging (integration, nightly replay) → Production (tagged releases).
Release Cadence: End of each phase = minor version increment (semver). Hotfix window reserved at end of Phases 2 & 4.
Feature Flags: enable metrics expansion, collaboration, WASM toggles for safe progressive rollout.

## 15. Change Management
- Architecture change proposal (ACP) template for schema or engine semantic changes (> moderate impact)
- Weekly backlog grooming & risk scan
- Phase retrospective feeding into next phase planning adjustments

## 16. Metrics & KPIs
Engineering:
- Mean lead time per story (target <7 days after Phase 2)
- Deployment frequency (target 2+ per week after Phase 1)
- Change failure rate (target <10%)
Product/Quality:
- Validator pass ratio trend (expect early dip, rising after Phase 2)
- Average derivation trace length (monitor complexity creep)

## 17. Initial Sprint (Phase 1 Sprint 1) Breakdown (2 weeks)
Stories: S1, S2, S5, S6, S12 (skeleton), S13 (calc stub)
Day 1-2: Migrations (semantic + roots/patterns) + rollback scripts
Day 3-4: Frame CRUD service + events wiring
Day 5-6: Root/pattern model + tests
Day 7: Pattern legality validator + cache invalidation logic
Day 8-9: Metrics snapshot stub + cluster complexity draft
Day 10: FrameBuilder + RootPatternBuilder UI prototypes
Day 11-12: Integrate validators into QA panel + property tests
Day 13: Hardening & docs (README updates)
Day 14: Sprint review & retro
Acceptance for sprint: All migrations applied & reverted cleanly in staging; semantics & root CRUD observable in event log; QA panel shows new validators.

## 18. Communication & Reporting
- Daily async status summary (blockers flagged)
- Weekly metrics snapshot (coverage, performance benchmark, open risks)
- Phase end report (AC table + risk deltas + improvement actions)

## 19. Open Assumptions (To Validate Early)
- Medium dataset definition: 5K lexemes, 300 patterns, 150 frames (confirm with stakeholders)
- Acceptable initial homophony density baseline threshold (TBD empirical)
- Collaboration concurrency target: up to 5 simultaneous editors per language

## 20. Next Steps (Actionable Immediately)
1. Approve this plan or annotate variances.
2. Prepare migration naming convention document (prefix with phase + timestamp).
3. Establish synthetic dataset generator script for performance baselines (Phase 0).
4. Draft ACP template & add to repo.
5. Begin Phase 0 execution.

---
(End of Implementation Plan)

