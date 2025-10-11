import { computeMetrics, recordMetricsSnapshot, getSnapshotHistory } from '@core/metrics'
import { createCoreTestDb } from './utils/morphologyTestUtils'

describe('metrics edge cases (Phase 3)', () => {
  it('returns zeros for empty lexicon and no patterns/bindings', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const result = await computeMetrics(1, db as any)
      expect(result.ambiguity).toBe(0)
      expect(result.morphologicalOpacity).toBe(0)
      expect(result.processingLoad).toBeGreaterThanOrEqual(0)
      expect(result.processingLoad).toBeLessThanOrEqual(100)
    } finally {
      await dispose()
    }
  })

  it('handles missing roots gracefully when bindings exist', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      // insert a pattern and a binding where the root exists but has an empty representation
      const [pattern] = await db.insert((db as any).patterns).values({ name: 'P1', skeleton: 'CVC', slotCount: 2 }).returning()
  const [root] = await db.insert((db as any).roots).values({ representation: '', gloss: 'empty-root' }).returning()
  await db.insert((db as any).rootPatternBindings).values([{ rootId: root.id, patternId: pattern.id, generatedForm: 'xyz' }])

      const result = await computeMetrics(1, db as any)
      // opacity should be computed and not throw; since rootRep missing and generatedForm length>3 rule applies
      expect(result.morphologicalOpacity).toBeGreaterThanOrEqual(0)
      expect(result.morphologicalOpacity).toBeLessThanOrEqual(100)
    } finally {
      await dispose()
    }
  })
})
