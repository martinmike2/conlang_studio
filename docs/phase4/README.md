# Phase 4 — Benchmarking & Profiling Runbook

This runbook explains how to run the Phase 4 benchmark harness and a CPU profiling run for the worker recompute path.

Prerequisites
- PostgreSQL accessible and populated for the test run (see `scripts/benchmarks/phase4/seed-db.ts` if present).
- `pnpm` installed and dependencies installed via `pnpm install`.
- `tsx` is used to run TypeScript scripts (already in devDependencies).

Quick commands

Run the lightweight micro-benchmark (in-process, no DB):

```bash
pnpm exec tsx scripts/benchmarks/phase4/run-benchmark.ts
```

Run a DB-backed worker recompute (default 1000 lexemes):

```bash
pnpm exec tsx scripts/benchmarks/phase4/run-worker.ts --use-copy
```

Profile the worker with V8's profiler (generates processed profile under `benchmarks/phase4`):

```bash
# Make the profiling helper executable first (once)
chmod +x scripts/benchmarks/phase4/profile-worker.sh

# Run (example using COPY path)
./scripts/benchmarks/phase4/profile-worker.sh --use-copy 1000
```

What the profiler does
- Runs the worker under `node --prof` (via `NODE_OPTIONS`) and generates a V8 log `isolate-*-v8.log`.
- The script then runs `node --prof-process` to create a human-readable profile in `benchmarks/phase4/`.
- The processed file contains function-level CPU time breakdowns and helps confirm whether `paradigm.compute` (JS compute) or `paradigm.persist` (DB persistence) dominates.

Recommended analysis steps
1. Run the full DB-backed worker with a representative dataset (e.g., 5k lexemes × 5 patterns) to reveal realistic hotspots.
2. Run the profiler script and inspect `benchmarks/phase4/isolate-*-v8.log.processed.txt`.
3. Look for heavy functions; if compute functions (generator, pattern compilation, regex matching) take >10% total CPU/time, consider a focused WASM prototype. If persist dominates, focus on COPY/UNNEST/incremental strategies.
4. Optionally run `0x` or `clinic` for flamegraphs if you want richer visualizations.

Next actions
- If profiling confirms compute hotspots: prototype a WASM rewrite for the hot function.
- If persist dominates: prototype COPY-based persistence or tune batchSize/concurrency and re-run harness.

Artifacts
- `benchmarks/phase4/baseline.json` — microbenchmark baseline
- `benchmarks/phase4/regeneration-baseline.json` — DB-backed regeneration baseline
- `benchmarks/phase4/worker-regeneration-baseline.json` — worker run artifact
- `benchmarks/phase4/isolate-*-v8.log` and `benchmarks/phase4/isolate-*-v8.log.processed.txt` — profiling artifacts

If you want, I can run the profiling script here (requires access to a DB bound to `.env`) or I can prepare a CI workflow to run it on a pinned machine.
