import { describe, it, expect } from 'vitest'
import { createCoreTestDb } from './utils/morphologyTestUtils'
import { createOverlay, getOverlay } from '@core/overlays/service'

describe('overlay edgecases', () => {
  it('handles concurrent creates without throwing', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const inputs = Array.from({ length: 10 }).map((_, i) => ({ name: `o${i}`, ops: [], languageId: null }))
      const outs = await Promise.all(inputs.map((inp) => createOverlay(db as any, inp as any)))
      expect(outs.length).toBe(10)
    } finally {
      await dispose()
    }
  })

  it('rejects invalid ops payloads gracefully', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      // malformed op: missing action
      const bad = { name: 'bad', ops: [{ id: 1 }] }
      await expect(createOverlay(db as any, bad as any)).rejects.toThrow()
    } finally {
      await dispose()
    }
  })

  it('supports large ops arrays', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const ops = Array.from({ length: 1000 }).map((_, i) => ({ action: 'add', pattern: `p${i}`, replacement: `r${i}` }))
      const out = await createOverlay(db as any, { name: 'big', ops, languageId: null } as any)
      const got = await getOverlay(db as any, out.id)
      expect(got).not.toBeNull()
      expect((got as any).ops.length).toBe(1000)
    } finally {
      await dispose()
    }
  })
})
