# Metrics spec (Phase 3)

- Date: 2025-10-09
- Summary: Phase 3 added three new heuristic complexity metrics: `ambiguity`, `morphologicalOpacity`, and `processingLoad`.
- Implemented in: `packages/core/metrics/service.ts` (functions: calculateAmbiguityMetric, calculateMorphologicalOpacityMetric, calculateProcessingLoadMetric) and wired into `computeMetrics`.
- Dashboard labels added: `apps/web/lib/ui/MetricsDashboard.tsx` to surface the new metrics.
- Tests: `packages/testkits/tests/metrics.expansion.test.ts` (basic seed + assertions). More edge-case tests recommended.
- Notes: No DB schema changes. Metrics persisted into `complexity_snapshots.metrics`.

Use this memory to quickly discover where Phase 3 metric logic lives and the doc at `docs/metrics_spec.md` for the detailed spec.