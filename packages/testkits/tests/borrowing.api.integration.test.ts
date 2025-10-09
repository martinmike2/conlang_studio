import { describe, it, expect } from 'vitest'
import { createCoreTestDb } from './utils/morphologyTestUtils'
import { createBorrowingService } from '@core/borrowing/service'
import { handleIntake } from '../../../apps/web/app/api/borrowing/intake/route'
import * as schema from "../../db/schema/core"

describe('borrowing intake API (integration)', () => {
  it('persists contact event to the DB', async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const service = createBorrowingService(db as any)

      const body = {
        donorLanguage: 'Spanish',
        recipientLanguage: 'LangY',
        sourceText: 'mañana',
        normalizedForm: 'manana',
        metadata: { source: 'integration-test' }
      }

      const res = await handleIntake(service.createContactEvent.bind(service), body)
      expect(res).toBeTruthy()

  // verify persisted
  const rows = await db.select().from(schema.contactEvents)
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0].donorLanguage).toBe('Spanish')
    } finally {
      await dispose()
    }
  })
})
