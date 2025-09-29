## Job Lifecycle Event Schema

Emitted by `runJob` in `packages/core/jobs.ts`.

```ts
interface JobLifecycleEvent {
  jobId: string
  name: string
  phase: 'start' | 'success' | 'error'
  ts: string // ISO timestamp
  detail?: Record<string, any>
}
```

### Emission Points
1. start – before the job function executes
2. success – after successful completion
3. error – after catching an error (includes `detail.message`)

### Metrics Side Effects
- Histogram: `job_duration_ms` (one observation per terminal phase)
- Counters: `job_success_total`, `job_error_total`

### Correlation
`jobId` is also used as `requestId` in the contextual logger child for unified tracing.

### Subscription
`subscribeJobEvents(fn)` allows in-process observers to consume events (e.g., future WebSocket push, persistence, or test assertions).
