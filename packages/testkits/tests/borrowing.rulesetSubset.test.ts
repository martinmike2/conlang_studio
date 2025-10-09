import { describe, it, expect } from 'vitest'
import { createCoreTestDb } from './utils/morphologyTestUtils'
import { createBorrowingService } from '@core/borrowing/service'
import * as schema from '../../db/schema/core'

describe('applyRulesetSubset', () => {
  it('applies rules selected by ids and returns applied ids', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const svc = createBorrowingService(db as any)

      const [rs] = await db.insert(schema.loanRulesets).values({ name: 'subset-test', description: 'subset' }).returning()
      const [r1] = await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 1, pattern: 'a', replacement: 'x' }).returning()
      const [r2] = await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 2, pattern: 'b', replacement: 'y' }).returning()
      const [r3] = await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 3, pattern: 'c', replacement: 'z' }).returning()

  const res = await svc.applyRulesetSubset(rs.id, 'abcabc', { ids: [r2.id, r3.id] })
  // only b->y and c->z were selected, so a remains unchanged
  expect(res.output).toBe('ayzayz')
      // order of applied should reflect priority ordering from DB (r2 then r3)
      expect(res.applied).toEqual([r2.id, r3.id])
    } finally {
      await dispose()
    }
  })

  it('limits number of rules applied by limit option', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const svc = createBorrowingService(db as any)

      const [rs] = await db.insert(schema.loanRulesets).values({ name: 'limit-test', description: 'limit' }).returning()
      await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 1, pattern: 'a', replacement: '1' })
      await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 2, pattern: 'b', replacement: '2' })
      await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 3, pattern: 'c', replacement: '3' })

      const res = await svc.applyRulesetSubset(rs.id, 'abc', { limit: 2 })
      // only first two rules (priority 1 and 2) applied
      expect(res.output).toBe('12c')
      expect(res.applied.length).toBe(2)
    } finally {
      await dispose()
    }
  })

  it('skips invalid regex patterns instead of throwing', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const svc = createBorrowingService(db as any)

      const [rs] = await db.insert(schema.loanRulesets).values({ name: 'invalid-regex-test', description: 'invalid' }).returning()
      // insert an invalid pattern
      await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 1, pattern: '[unclosed', replacement: 'X' })
      await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 2, pattern: 'a', replacement: 'A' })

      const res = await svc.applyRulesetSubset(rs.id, 'a')
      // invalid pattern skipped; the second rule should apply
      expect(res.output).toBe('A')
      expect(res.applied.length).toBe(1)
    } finally {
      await dispose()
    }
  })
})
