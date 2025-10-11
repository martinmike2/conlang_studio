# Metrics specification (Phase 3)

Date: 2025-10-09
Author: automated update (pair-programmer)

Summary

This document describes the Phase 3 metrics expansion implemented in the codebase. It defines three new complexity metrics, their inputs, the heuristics used for calculation, expected ranges and interpretation, common edge cases, and test/acceptance criteria.

Metrics added

1) Lexical Ambiguity (`ambiguity`)

- Purpose: Estimate how lexically ambiguous the lexicon is by measuring how many lexeme senses share identical gloss strings.
- Data sources: `lexeme_senses.gloss` (DB table `lexeme_senses`).
- Algorithm (heuristic):
  - Normalize glosses (trim + toLowerCase()).
  - Count how many senses have a gloss that occurs more than once. Let `ambiguousSenseCount` be the total number of senses that belong to a duplicated-gloss group.
  - Ambiguity ratio = ambiguousSenseCount / totalSenses.
  - Output = roundMetric(min(ambiguityRatio * 100, 100)).
- Range / interpretation: 0..100 (percentage). 0 = no duplicate glosses; higher values indicate more shared glosses (possible synonymy/homonymy or underspecified glossing).
- Edge cases: empty or null glosses are ignored. Very small lexicons (< 5 senses) will be noisy; interpret cautiously.
- Tests: seed multiple senses with same gloss; assert `ambiguity` > 0 and within 0..100.

2) Morphological Opacity (`morphologicalOpacity`)

- Purpose: Heuristically estimate how opaque morphological derivation is, i.e., how often generated surface forms diverge substantially from their recorded root representations.
- Data sources: `root_pattern_bindings.generated_form` and `roots.representation` (via `root_pattern_bindings.root_id` join to `roots`).
- Algorithm (heuristic):
  - For each binding with a `generated_form`, normalize both generated form and root representation (remove non-letter characters, toLowerCase()).
  - If no root representation exists, treat longer generated forms as likely opaque (simple heuristic: `g.length > 3` increases opacity).
  - Compute a simple prefix-match heuristic: measure the longest shared prefix and divide by the shorter length -> `prefixRatio`.
  - If `prefixRatio < 0.5` OR relative length difference > 0.4, count binding as opaque.
  - Output = roundMetric(min((opaqueCount / totalBindings) * 100, 100)).
- Range / interpretation: 0..100 (percentage). 0 = generated forms generally transparent relative to roots; higher values indicate greater divergence (more opaque morphology).
- Edge cases: roots absent, non-alphabetic orthographies — metric uses letter-preserving normalization; for languages with heavy orthographic variation, consider mapping to phonological form first.
- Tests: seed bindings where one generated form equals or closely matches the root and another diverges; expect `morphologicalOpacity` between 0..100 and >0 when divergence exists.

3) Processing Load (`processingLoad`)

- Purpose: Provide an integrated heuristic estimate of cognitive/processing demand combining articulatory effort and cluster complexity.
- Data sources: re-uses `articulatoryLoad` (generated forms / patterns) and `clusterComplexity` (pattern skeleton cluster parsing).
- Algorithm:
  - Normalize both component metrics to 0..1 (divide by 100 and clamp).
  - Combine with weights: articulation weight 0.45, cluster complexity weight 0.55.
  - Output = roundMetric(min((aNorm * 0.45 + cNorm * 0.55) * 100, 100)).
- Range / interpretation: 0..100 (percentage). Higher values indicate higher combined articulatory and cluster-based complexity.
- Edge cases: if either component is missing, the other still contributes proportionally.
- Tests: when articulation and cluster scores are at extremes, processingLoad should reflect weighted combination.

Implementation notes

- Location:
  - Core metrics code: `packages/core/metrics/service.ts` (functions added: `calculateAmbiguityMetric`, `calculateMorphologicalOpacityMetric`, `calculateProcessingLoadMetric`; wired into `computeMetrics`).
  - Dashboard UI labels: `apps/web/lib/ui/MetricsDashboard.tsx` (labels added so the new keys render in the dashboard).
  - Tests: `packages/testkits/tests/metrics.expansion.test.ts` (basic seed + assertions) — more edge-case tests are recommended.
- Storage: metrics are recorded to `complexity_snapshots.metrics` (JSONB) via existing `recordMetricsSnapshot` flow; no schema changes were required.
- Interpretation guidance: these are heuristic, domain-specific measures intended for relative comparisons and trend tracking rather than absolute psycholinguistic measurements. Use them as indicators to prioritize curation or deeper analyses.

Acceptance criteria

- Each metric returns a finite, bounded number in 0..100 under normal DB contents.
- Unit tests exist for each metric (happy path + 1 edge case each) and pass in `packages/testkits`.
- The metrics are included in snapshots persisted to `complexity_snapshots.metrics` and displayed in the web dashboard.

Performance & scaling notes

- Calculations read tables (`lexeme_senses`, `root_pattern_bindings`, `patterns`, `roots`) and may scan many rows for large lexica. Consider adding sampling or batching for very large datasets (>100k rows).
- Metrics job already runs in a worker/job context and is debounced by default (see `enqueueMetricsJob` defaults).

Next steps / recommendations

- Add `docs/examples/metrics_example.json` with a sample snapshot JSON showing the metric keys and values.
- Add focused unit tests for edge cases (empty glosses, missing roots, highly polysemous lexicons).
- Consider adding language-specific normalization helpers (orthography -> phonology) before opacity calculations for higher-quality signals.

---

