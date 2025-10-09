import { describe, it, expect } from 'vitest'
import { createMorphologyTestHarness } from './utils/morphologyTestUtils'

describe('Morphology integration classifier', () => {
  it('returns roots and patterns as candidates for integration', async () => {
    const { service, db, dispose } = await createMorphologyTestHarness()

    // create a root and a pattern
    const root = await service.createRoot({ representation: 'ktb', gloss: 'write' })
    const pattern = await service.createPattern({ name: 'CaCaC', skeleton: 'C-a-C-a-C', slotCount: 3 })

  const candidates = await service.classifyIntegration('kitab')

  // expect at least one candidate and include the created pattern/root ids
  const rootIds = candidates.map((c) => c.rootId).filter(Boolean)
  const patternIds = candidates.map((c) => c.patternId).filter(Boolean)

  expect(rootIds).toContain(root.id)
  expect(patternIds).toContain(pattern.id)

  // candidates should include normalized surface and pattern skeleton metadata
  expect(candidates[0]).toHaveProperty('normalizedSurface')
  expect(candidates.some((c) => c.patternSkeleton)).toBeTruthy()

    await dispose()
  })
})
