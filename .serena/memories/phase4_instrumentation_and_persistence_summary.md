Phase 4 work summary (instrumentation, harnesses, persistence experiments):

- Instrumentation: Added `startSpan(name)` to `packages/core/metrics/registry.ts` to measure phases (paradigm.fetch, paradigm.compute, paradigm.persist).
- Bench harnesses: Added microbenchmark and full regeneration harnesses under `scripts/benchmarks/phase4/`:
  - `run-benchmark.ts` (generator inner-loop)
  - `run-regeneration.ts` (DB-backed optional, seeds synthetic lexicon and patterns)
  - `run-worker.ts` (runs recompute worker)
  - `compare-persistence.ts` (new: compares COPY, UNNEST+concurrency, multi-insert, Drizzle across batch sizes)
- Persistence experiments: implemented multiple persistence paths in `packages/core/morphology/recomputeWorker.ts`:
  - Drizzle insert (ORM)
  - Multi-row parameterized INSERT
  - UNNEST-based bulk insert
  - COPY FROM STDIN using `pg-copy-streams` (prototype)
  - Implemented UNNEST+concurrency in event-driven `processInvalidation`
- DB schema: added collab migrations/schema earlier (collab work separate)
- Results: UNNEST + concurrency (4) was fastest in local comparison; COPY was competitive at higher batch sizes. Final tuning run (regeneration harness with UNNEST+concurrency) produced persist~1561ms for 5k lexemes × 5 patterns.

Files to inspect:
- `packages/core/morphology/recomputeWorker.ts` (persistence strategies + processInvalidation)
- `scripts/benchmarks/phase4/*` (harnesses and compare script)
- `benchmarks/phase4/*.json` (baseline artifacts)

Next recommended steps: tuning batchSize/concurrency sweep, streaming COPY implementation, and incremental diff/upsert prototype.
