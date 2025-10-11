# Metrics Dashboard — Polish & Richer Visuals

Date: 2025-10-09

Purpose

Capture the scope and acceptance criteria for the "Richer Metrics Dashboard" polish task tracked in the project checklist. This document outlines what to build, where to implement it, rough UX, data needs, and tests.

Goals

- Add compact historical sparkline charts to each metric card showing the last N snapshots (default N=20).
- Add small tooltip explanations per metric (hover/click) using the descriptions from `docs/metrics_spec.md`.
- Add a metrics detail page for a single metric with an interactive time series (zoom & export CSV) and basic trend regression line.
- Ensure UI uses existing Metrics API endpoints (`/api/metrics`) and doesn't create new heavy endpoints; paginated history endpoint exists and will be used.

Where to implement

- UI components:
  - `apps/web/lib/ui/MetricsSparkline.tsx` — new tiny component wrapping a lightweight chart lib (e.g., `recharts` or `sparkline` SVG) or custom minimal SVG path.
  - `apps/web/lib/ui/MetricsTooltip.tsx` — small tooltip component reusing `METRIC_LABELS` and `docs/metrics_spec.md` text.
  - `apps/web/app/metrics/[metric]/page.tsx` — detail page for a metric (Next.js route) showing time series, export button.
  - Update `apps/web/lib/ui/MetricsDashboard.tsx` to include `MetricsSparkline` on each metric card and to render tooltip triggers.

- API usage:
  - GET `/api/metrics/latest` — short snapshot (existing API).
  - GET `/api/metrics/history?metric=<key>&limit=100` — history endpoint; if the API path differs, use existing history route. Implement client-side caching + debounce.

Implementation notes

- Charting library:
  - Prefer zero-dependency minimal sparkline (SVG path) for small cards to keep bundle size small.
  - For detail page, consider `recharts` (already used elsewhere) or `victory` if present; otherwise simple D3-lite path.

- Data shape:
  - Expect history response as [{timestamp: string, metrics: { key: value, ... }}, ...]
  - Convert to numeric series by extracting metric values for the metric key.

- Accessibility:
  - Provide aria-labels for sparkline SVGs.
  - Tooltips should be keyboard-accessible (focusable trigger).

- Acceptance criteria:
  - Each metric card displays a sparkline for the last 20 snapshots.
  - Hovering or focusing the metric label shows a tooltip with the description from `docs/metrics_spec.md`.
  - Metric detail page fetches up to 1,000 historical samples and displays an interactive chart and CSV export button.
  - Tests: add a small React Testing Library test for `MetricsSparkline` snapshot rendering and for `MetricsTooltip` showing text when focused.

- Performance:
  - Debounce history requests on rapid repeated opens (300ms).
  - Use lightweight in-memory cache keyed by metric+limit to avoid repeated requests when navigating back and forth.

- Next steps / estimations

1. Implement `MetricsSparkline` + unit test — 2-3h.
2. Wire sparklines into dashboard and add tooltip triggers — 1-2h.
3. Implement metric detail page with export — 3-4h.
4. UX review & accessibility pass — 1-2h.

Notes

- This polish task can be implemented incrementally: start with static sparklines using server-rendered snapshot history and add interactivity later.
- If a chart library is introduced, add it to workspace root `package.json` and update `pnpm-lock.yaml`.

