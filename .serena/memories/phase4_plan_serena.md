# Phase 4 Implementation Plan — Optimization, Collaboration, Rule Graph UI

This memory captures a detailed, actionable plan for Phase 4 (Optimization (WASM), Collaboration (Y.js) integration + event bridging, and Rule Dependency Graph UI) derived from the project's `docs/implementation_plan.md` and `docs/architecture.md`.

## Purpose
Make Phase 4 implementable as a set of small, reviewable PRs with clear acceptance criteria, tests, and rollback strategies. Capture design decisions and constraints so future phases (Phase 5 deterministic replay, security hardening) can rely on these artifacts.

## Goals & Exit Gates
- Performance: Paradigm regeneration p95 < 2.0s for a medium language (5K lexemes). Measured with a reproducible benchmark harness.
- Collaboration: In-browser collaborative editing MVP (Y.js) with server-side event bridging and persisted event log for audit/replay. Collaboration must allow multi-user editing of rule sets and lexicon items with live cursors and conflict resilience.
- Rule Graph UI: Interactive dependency graph showing rules (nodes) and dependencies (edges), supporting search, expand/collapse, and navigation into the rule editor.
- Exit gates: benchmark results, e2e collaboration smoke test, graph UI integration tests, CI lint/types/test green, migration dry-run passes.

## Non-goals (for Phase 4)
- Full deterministic replay gating (Phase 5 will own deterministic replay acceptance and governance).
- Security hardening beyond basic auth checks and CSRF protections (Phase 5).

## Top-level Strategy
1. Measure and profile before doing heavy-engine changes (WASM): collect baseline metrics and heatmap of CPU/time per operation across regression dataset.
2. Deliver a collaboration MVP using Y.js in the frontend and an append-only event bridge in the backend. Keep events rich enough for later deterministic replay but do not attempt full replay determinism yet.
3. Implement rule dependency graph as a backend API that computes dependencies (cached) and a lightweight frontend interactive visualization.
4. Only add WASM after profiling proves a hotspot responsible for >=10% of total CPU/time spent in the regeneration pipeline. If WASM is chosen, follow small prototype → integration → benchmark cycle.

## Concrete Tasks (PR-sized items)
Each item is intended to be small and testable.

A. Instrumentation & Benchmarking (PR-000)
- Add reproducible benchmark harness script under `scripts/benchmarks/phase4/` that runs paradigm regeneration against the synthetic dataset generator.
- Add a baseline perf test that produces p50/p95/p99 numbers and flamegraph-compatible traces. Save baselines in `benchmarks/phase4/baseline.json`.
- Files touched: `scripts/`, small additions to `packages/core/metrics.ts` to add timing spans.
- Tests: unit smoke for harness. Acceptance: harness runs locally and in CI stage and produces output artifact.

B. Profiling & Analysis (PR-001)
- Run baseline harness and profile CPU/time. Produce a short findings doc `docs/phase4/profiling_findings.md` with hotspots list.
- Decide whether WASM is necessary. If no hotspot >10% total CPU, skip WASM and optimize JS paths (caching, memoization, algorithmic improvements).

C. Collaboration MVP — Frontend integration (PR-002)
- Add Y.js client integration to web app edit pages for rules and lexicon entries. Prefer modular integration in `apps/web/lib/hooks/useCollab.ts` and new component `apps/web/lib/ui/CollabProvider.tsx`.
- Provide shared awareness (presence) with cursors and basic conflict resolution UI.
- Minimal UI: presence indicators and live cursors; a toggle to enable/disable collaboration per document.
- Tests: unit tests for hook behaviors; Playwright scenario for multi-page collaboration smoke (two browser contexts editing same document).

D. Collaboration MVP — Backend bridge & persistence (PR-003)
- Implement event bridge service in `packages/core/activity/service.ts` or `packages/core/overlays/service.ts` if overlays are more appropriate. New endpoints under `apps/web/app/api/collab/`:
  - POST /api/collab/sessions -> create session
  - POST /api/collab/events -> append event
  - GET /api/collab/events?sessionId= -> stream events for replay/sync
- New DB tables in `db/schema`: `collab_sessions`, `collab_events` (append-only). Add a migration under `db/migrations`.
- Ensure events include actor_id, client_seq, server_seq, timestamp, payload, and signature/hash for future replay integrity checks.
- Tests: integration test ensuring events are persisted and retrievable in order.

E. Rule Dependency Graph — Backend (PR-004)
- Add graph computation service in `packages/core/overlays/service.ts` or `packages/core/graph/service.ts` (new small module). Input: languageId or rule set ID. Output: nodes/edges JSON (node metadata: id, label, type, rule summary; edge metadata: type: triggers/depends-on; weight/explanation string).
- Implement caching using existing caching module (see `packages/core/morphology/cache.ts`) or add `cache.ts` in `packages/core/graph/` with TTL.
- Tests: unit tests for graph computation on small sample rule sets; integration test hitting API

F. Rule Dependency Graph — Frontend (PR-005)
- Build a graph viewer component under `apps/web/lib/ui/RuleGraph.tsx`. Use a graph viz library (lightweight choices: `react-flow`, `vis-network`, or `d3-force` wrapped with `react-use-gesture`). Prefer `react-flow` for quick interaction.
- Features: pan/zoom, node click navigates to rule editor route, search/filter, expand/collapse, highlight cycles.
- Tests: component unit tests + Playwright e2e: open graph, search node, navigate to editor.

G. WASM Prototype (conditional) (PR-006-proto)
- If profiling motivates: identify small, hot pure compute function(s) suitable for WASM rewrite (e.g., pattern compilation or paradigm generation inner loop).
- Create a minimal Rust/AssemblyScript prototype compiled to WASM and exercised from a Node harness (`packages/core/engine-wasm/`), with microbenchmarks vs JS baseline.
- Acceptance: WASM version must show meaningful improvement on hotspot (>20% faster for hotspot) and overall p95 improves to target.

H. WASM Integration & Rollout (PR-007 if applicable)
- Integrate WASM module with fallback to JS for environments without WASM support.
- Add packaging steps to CI to build WASM artefact and include in artifact releases.
- Tests: unit tests for correctness parity; performance benchmarks showing improvement.

I. CI & Release Tasks (PR-008)
- Add CI job `phase4:bench` that runs benchmarks and profiles; job is optional (manual) but required for merge to main if WASM is included.
- Add migration dry-run stage to CI that applies new `collab_*` migrations against a test DB container.

J. Docs & Runbooks (PR-009)
- `docs/phase4/README.md` with run instructions for local testing, applying migrations, and running the collaboration smoke test.
- Update `docs/task_checklist.md` to mark Phase 4 tasks and Quality Gates.

## DB changes (high level)
- New tables: `collab_sessions` (id, language_id, owner_id, created_at, last_active), `collab_events` (id, session_id, actor_id, client_seq, server_seq, payload jsonb, created_at, hash)
- Add indices: (session_id, server_seq), (session_id, client_seq)
- Migrations: add reversible up/down migrations and test with `scripts/migrations-dry-run.ts`.

## Data contracts & Types
- Add TypeScript interfaces under `packages/core/overlays/types.ts` or `packages/core/activity/types.ts` for collab events and graph nodes/edges.
- Frontend hooks use these types (`apps/web/lib/types/collab.ts` and `apps/web/lib/types/graph.ts`).

## Tests & QA
- Unit: each new service + hook + component with happy path + 1 failure case.
- Integration: event persistence + graph API using test DB.
- E2E: Playwright multi-browser test for collaboration (two users join session, both edit and see the other's updates), RuleGraph navigation flow.
- Performance: benchmark harness with artifacts stored in `benchmarks/phase4/` and run in optional CI stage.

## Timelines (4-week sprint split)
Week 0 (Sprint start): Instrumentation & profiling (A + B)
Week 1: Collaboration frontend + backend MVP (C + D)
Week 2: Rule Graph backend + frontend (E + F)
Week 3: Conditional WASM prototype + decision, CI + docs + cleanup (G + H + I + J)

If WASM is required, allow one additional week for integration and benchmarking.

## Acceptance Criteria (detailed)
- Collaboration: two users editing same rule/lexeme see each other's updates within 1s; events persisted in DB; Playwright test passes.
- Rule graph: loads for 1k-rule set within 2s server-side and <500ms client-side rendering for a 5k-rule downsampled view; nodes link to editors.
- Performance: p95 < 2.0s for medium language regeneration against the benchmark harness (or documented fallback path to continue work if WASM deferred).
- CI: migration dry-run passes; lint/type/tests green.

## Risks & Mitigations
- Risk: WASM adds build/packaging complexity; Mitigation: prototype first; fallback path to JS.
- Risk: Collaboration events grow unbounded; Mitigation: compaction strategy (snapshot + tail pruning) planned in Phase 5.
- Risk: Graph cycles and size cause overwhelm; Mitigation: server-side downsampling, cluster/collapse heuristics, and paging.

## Follow-ups / Items for Phase 5
- Deterministic replay gating (use collab_events + signatures to enable deterministic replay testing).
- Security: auth Z role model for collaborative sessions, event access control, audit retention policies.

---

Generated: 2025-10-09
