import { recordMetricsSnapshot, getSnapshotHistory } from '@core/metrics'
import { createCoreTestDb } from './utils/morphologyTestUtils'

describe('metrics snapshot timeline (Phase 3)', () => {
  it('persists snapshots and returns history in descending order', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const a = await recordMetricsSnapshot(1, { metrics: { articulatoryLoad: 1 } }, db as any)
      // small delay between snapshots
      await new Promise((r) => setTimeout(r, 10))
      const b = await recordMetricsSnapshot(1, { metrics: { articulatoryLoad: 2 } }, db as any)

      const history = await getSnapshotHistory(1, 10, db as any)
      expect(history.length).toBeGreaterThanOrEqual(2)
      // history[0] should be the most recent (b)
      expect(history[0].id).toBe(b.id)
      expect(history[1].id).toBe(a.id)
    } finally {
      await dispose()
    }
  })
})
