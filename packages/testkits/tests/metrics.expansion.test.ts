import { computeMetrics } from '@core/metrics'
import { lexemeSenses, patterns, rootPatternBindings, roots, semanticFrames } from '../../db/schema/core'
import { createCoreTestDb } from './utils/morphologyTestUtils'

async function seedBaselineData(db: Awaited<ReturnType<typeof createCoreTestDb>>["db"]) {
  const [frame] = await db
    .insert(semanticFrames)
    .values({
      name: 'Commerce',
      slug: 'commerce',
      domain: 'test',
      description: 'Commerce frame',
      roles: [
        { name: 'buyer', cardinality: 'single', order: 0 },
        { name: 'seller', cardinality: 'single', order: 1 }
      ]
    })
    .returning()

  // two senses sharing the same gloss to seed ambiguity
  await db.insert(lexemeSenses).values([
    { frameId: frame.id, gloss: 'trade', definition: 'to trade goods' },
    { frameId: frame.id, gloss: 'trade', definition: 'an act of trading' }
  ])

  const [pattern] = await db
    .insert(patterns)
    .values({ name: 'Form I', skeleton: 'C-a-C-a-C', slotCount: 3 })
    .returning()

  const [root] = await db
    .insert(roots)
    .values({ representation: 'k-t-b', gloss: 'write' })
    .returning()

  // one binding where generated form is similar to root, one where it diverges
  await db.insert(rootPatternBindings).values([
    { rootId: root.id, patternId: pattern.id, generatedForm: 'katab' },
    { rootId: root.id, patternId: pattern.id, generatedForm: 'xylophone' }
  ])
}

describe('metrics expansion (Phase 3)', () => {
  it('computes ambiguity, opacity and processing load metrics', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      await seedBaselineData(db)
      const result = await computeMetrics(1, db as any)

      expect(result.ambiguity).toBeGreaterThanOrEqual(0)
      expect(result.ambiguity).toBeLessThanOrEqual(100)

      expect(result.morphologicalOpacity).toBeGreaterThanOrEqual(0)
      expect(result.morphologicalOpacity).toBeLessThanOrEqual(100)

      expect(result.processingLoad).toBeGreaterThanOrEqual(0)
      expect(result.processingLoad).toBeLessThanOrEqual(100)
    } finally {
      await dispose()
    }
  })
})
