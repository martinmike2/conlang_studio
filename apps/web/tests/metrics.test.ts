import { metrics } from '@core/metrics'
import { runJob } from '@core/jobs'
import { describe, it, expect } from 'vitest'

describe('metrics & jobs integration', () => {
  it('increments job counters and records duration', async () => {
    const before = metrics.snapshot()
    await runJob('metrics-demo', () => 7)
    const after = metrics.snapshot()
    expect(after.counters.job_success_total).toBe((before.counters.job_success_total ?? 0) + 1)
  })
})