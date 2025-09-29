import { runJob } from '@core/jobs'
import { describe, it, expect } from 'vitest'

// Simple smoke test invoking a job runner to ensure cross-package imports work.
describe('web smoke', () => {
  it('runs a job', async () => {
    const result = await runJob('smoke', () => 42)
    expect(result).toBe(42)
  })
})
