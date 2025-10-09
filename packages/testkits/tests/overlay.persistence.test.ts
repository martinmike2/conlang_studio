import { describe, it, expect } from 'vitest'
import { createCoreTestDb } from './utils/morphologyTestUtils'
import * as overlays from '@core/overlays'

describe('overlay persistence', () => {
  it('creates and retrieves overlay', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const created = await overlays.createOverlay(db as any, { name: 'test', ops: [{ action: 'add', pattern: 'a', replacement: 'b' }] as any })
      expect(created.id).toBeTruthy()
      const fetched = await overlays.getOverlay(db as any, created.id)
      expect(fetched).toBeTruthy()
      expect(Array.isArray(fetched.ops)).toBe(true)
    } finally {
      await dispose()
    }
  })
})
