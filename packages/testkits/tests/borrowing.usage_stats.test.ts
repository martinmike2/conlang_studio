import { it, expect } from 'vitest'
import { createCoreTestDb } from './utils/morphologyTestUtils'
import { createMorphologyService } from '@core/morphology'
import * as schema from '../../db/schema/core'
import { getPool } from '../../db/client'

it('accepting a loan flag increments usage_stats', async () => {
  const { db, dispose } = await createCoreTestDb()
  // create a morphology service bound to the same test DB
  const svc = createMorphologyService(db as any)
  try {
    // create a root and pattern in the test DB
    const [root] = await db.insert(schema.roots).values({ representation: 'ktb', gloss: 'write' }).returning()
    const [pattern] = await db.insert(schema.patterns).values({ name: 'CaCaC', skeleton: 'C-a-C-a-C', slotCount: 3 }).returning()

    // create a contact event directly via DB
    const [contact] = await db.insert(schema.contactEvents).values({ donorLanguage: 'ar', recipientLanguage: 'xx', sourceText: 'kitab' }).returning()

    // call morphology service (bound to db)
    const candidates = await svc.classifyIntegration('kitab')
    expect(candidates.length).toBeGreaterThan(0)

    // create flag via service
    const flagsMod = await import('@core/loanFlags/service')
    const flagsSvc = flagsMod.createLoanFlagsService(db as any)
    const created = await flagsSvc.createLoanFlag({ contactEventId: contact.id, candidateRootId: root.id, reason: 'test' })
    expect(created).toBeTruthy()

    // accept it
    const accepted = await flagsSvc.acceptLoanFlag(created.id)
    expect(accepted).toBeTruthy()

  // assert usage_stats incremented for root
  const pool = getPool()
  const res = await pool.query("SELECT freq FROM usage_stats WHERE target_kind = 'root' AND target_id = $1", [root.id])
    const freq = res.rows[0] ? Number(res.rows[0].freq) : 0
    expect(freq).toBeGreaterThanOrEqual(1)
  } finally {
    await dispose()
  }
})
