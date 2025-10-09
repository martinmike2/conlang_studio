import { it, expect } from 'vitest'
import { createCoreTestDb } from './utils/morphologyTestUtils'
import { createLoanFlagsService } from '@core/loanFlags/service'
import * as schema from '../../db/schema/core'

it('LoanFlagsService: create, list, accept flow', async () => {
  const { db, dispose } = await createCoreTestDb()
  try {
    const svc = createLoanFlagsService(db as any)

    // Insert a contact event directly
  const [event] = await db.insert(schema.contactEvents).values({ donorLanguage: 'ar', recipientLanguage: 'xx', sourceText: 'kitab' }).returning()

    const created = await svc.createLoanFlag({ contactEventId: event.id, candidateRootId: 1, reason: 'test' })
    expect(created).toHaveProperty('id')
    const listed = await svc.listLoanFlags({ contactEventId: event.id })
    expect(listed.length).toBeGreaterThanOrEqual(1)

    const accepted = await svc.acceptLoanFlag(created.id, 'tester')
    expect(accepted).not.toBeNull()
    // accepted column is integer 0/1 in schema
    expect((accepted as any).accepted).toBeTruthy()
  } finally {
    await dispose()
  }
})
