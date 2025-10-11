# Phase 4 — Profiling Findings (initial)

Date: 2025-10-09

This document captures the initial results from the Phase 4 benchmark harness and recommended next steps.

## What I ran
- Script: `scripts/benchmarks/phase4/run-benchmark.ts`
- Config: phonemes=10, lexemes=1000, patternsPerLexeme=5

The harness is currently a focused microbenchmark that simulates paradigm generation by calling `generateBinding` for each root×pattern combination. It intentionally avoids DB I/O to provide a fast inner-loop baseline.

## Results (artifact)
- Artifact: `benchmarks/phase4/baseline.json`
- Summary from run:
  - count: 1000 lexemes
  - p50: 0 ms
  - p95: 0 ms
  - p99: 1 ms
  - total: 11 ms

Raw timings are included in the artifact. This baseline confirms that the pure in-process binding generator (`generateBinding`) is extremely cheap for the synthetic tokens used by the harness.

## Interpretation
- The current harness exercises only the `generateBinding` function (string tokenization, placeholder resolution, and concatenation). That function is not a hotspot in our current codebase.
- For realistic regeneration profiling we must include the following heavier operations:
  1. DB reads: fetching roots, patterns, bindings, and any derived lookups.
  2. Cache misses: exercise the cache layer and the cost of cache warm-up/invalidations.
 3. Additional morphology: ablaut scheme application, reduplication templates, and any pattern compilation/regex matching.
 4. Larger surface forms and realistic orthography/token sets (use `packages/testkits/synth` to generate more realistic tokens).

The Phase 4 plan's decision gate for WASM depends on seeing a hotspot responsible for >=10% of total CPU/time in a realistic harness. The current microbenchmark cannot surface such hotspots.

## Next recommended actions
1. Expand the harness to a full regeneration harness that:
   - boots a test DB (in-memory or a test Postgres) and seeds it with the synthetic dataset (roots, patterns, lexemes, bindings).
   - runs the actual regeneration pipeline used in the app (the service that assembles paradigms and writes `root_pattern_bindings`).
   - produces flamegraph-compatible traces (e.g., using `0x`, `clinic`, or Node's --prof tooling) and p50/p95/p99.

2. Add timing spans around the high-level regeneration phases (DB fetch, computing bindings, cache operations, persisting bindings) using `metrics.startSpan(name)` so we can attribute time precisely.

3. Run the full harness on a reproducible CI runner or an isolated machine with pinned CPU to obtain representative baselines.

4. If a hotspot emerges (>10% of total time), prototype a focused WASM rewrite for that function (Rust or AssemblyScript) and compare microbenchmarks before integrating.

## Quick tasks I can implement next
- Expand the harness to seed the test DB and run the real regeneration pipeline.
- Add `metrics.startSpan` calls to the regeneration service to capture phase timings.
- Add a CI job stub (optional manual job) to run the harness and upload `benchmarks/phase4/baseline.json` as an artifact.

If you want me to continue, I will implement seeding + a full regeneration harness next and add timing spans to the regeneration service.

## DB-backed runs (recent)

- I ran the regeneration harness against a Postgres instance (using values from the repo `.env`) to get realistic timings. Configuration used for the runs:
  - lexemes: 1000, patterns: 5, batchSize: 500
  - Artifact: `benchmarks/phase4/regeneration-baseline.json`
  - Timings: fetch=4ms, compute=8ms, persist=168ms, total=180ms

- I also performed a larger seed and worker run at 5000 lexemes × 5 patterns (25k bindings):
  - Seed run artifact: `benchmarks/phase4/regeneration-baseline.json` (overwritten by the large run)
  - Seed timings: fetch=12ms, compute=42ms, persist=1838ms, total=1892ms
  - Worker recompute run artifact: `benchmarks/phase4/worker-regeneration-baseline.json`
  - Worker timings: fetchMs=0, computeMs=50, persistMs=1621

### Interpretation & guidance

- Persist operations (writing `root_pattern_bindings`) dominate end-to-end time at realistic scales. Compute (`generateBinding`) remains small. This suggests optimizations should prioritize persistence:
  - Use COPY or bulk insertion strategies rather than per-row INSERTs for full rebuilds.
  - Consider incremental recompute (only affected root×pattern combinations) rather than full rebuilds; I added event-driven worker plumbing to support this.
  - Tuning batch size and parallelism with transactions or COPY streams may yield large wins.

If you'd like, I can now:
1. Run a CPU profiler (0x/clinic/node --prof) on the worker run to capture flamegraphs and confirm no JS compute hotspots exist. (recommended)
2. Prototype COPY-based persistence for the worker and benchmark it vs the current batched INSERT approach.
3. Expand the event-driven worker to compactly compute only affected rows (I started a minimal `processInvalidation` helper).
