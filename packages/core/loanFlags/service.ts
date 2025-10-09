import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { loanFlags } from '../../db/schema/core'
import type { InferModel } from 'drizzle-orm'
import { recordActivity } from '@core/activity'

type DbClient = ReturnType<typeof getDb>

export type LoanFlagRecord = InferModel<typeof loanFlags>
export type CreateLoanFlagInput = {
  contactEventId: number
  candidateRootId?: number | null
  candidatePatternId?: number | null
  reason?: string | null
  meta?: Record<string, unknown>
}

export function createLoanFlagsService(db: DbClient = getDb()) {
  return {
    async createLoanFlag(input: CreateLoanFlagInput) {
      const [created] = await db.insert(loanFlags).values({
        contactEventId: input.contactEventId,
        candidateRootId: input.candidateRootId ?? null,
        candidatePatternId: input.candidatePatternId ?? null,
  accepted: 0,
        reason: input.reason ?? null,
        meta: input.meta ?? {}
      }).returning()

      await recordActivity({
        scope: 'borrowing',
        entity: 'loan_flag',
        action: 'created',
        summary: `Loan flag #${created.id} created for contact event ${created.contactEventId}`,
        payload: created
      }, db)

      return created as LoanFlagRecord
    },

    async listLoanFlags(filter?: { contactEventId?: number }) {
      if (filter?.contactEventId) {
        return db.select().from(loanFlags).where(eq(loanFlags.contactEventId, filter.contactEventId)).orderBy(loanFlags.createdAt)
      }
      return db.select().from(loanFlags).orderBy(loanFlags.createdAt)
    },

    async acceptLoanFlag(id: number, actor?: string) {
  const [updated] = await db.update(loanFlags).set({ accepted: 1 }).where(eq(loanFlags.id, id)).returning()
      if (!updated) return null

      await recordActivity({
        scope: 'borrowing',
        entity: 'loan_flag',
        action: 'updated',
        summary: `Loan flag #${updated.id} accepted by ${actor ?? 'system'}`,
        payload: updated
      }, db)

      // Increment usage_stats for the chosen candidate (root or pattern) so classifier boosts reflect acceptance
      try {
        const { getPool } = await import('../../db/client')
        const pool = getPool()
        const languageId = 0
        if ((updated as any).candidateRootId) {
          const targetId = (updated as any).candidateRootId
          const sel = await pool.query(
            `SELECT id, freq FROM usage_stats WHERE language_id = $1 AND target_kind = 'root' AND target_id = $2`,
            [languageId, targetId]
          )
          if (sel.rows && sel.rows.length > 0) {
            await pool.query(`UPDATE usage_stats SET freq = freq + 1 WHERE id = $1`, [sel.rows[0].id])
          } else {
            await pool.query(
              `INSERT INTO usage_stats(language_id, target_kind, target_id, freq, created_at) VALUES ($1, 'root', $2, 1, now())`,
              [languageId, targetId]
            )
          }
        }
        if ((updated as any).candidatePatternId) {
          const targetId = (updated as any).candidatePatternId
          const sel = await pool.query(
            `SELECT id, freq FROM usage_stats WHERE language_id = $1 AND target_kind = 'pattern' AND target_id = $2`,
            [languageId, targetId]
          )
          if (sel.rows && sel.rows.length > 0) {
            await pool.query(`UPDATE usage_stats SET freq = freq + 1 WHERE id = $1`, [sel.rows[0].id])
          } else {
            await pool.query(
              `INSERT INTO usage_stats(language_id, target_kind, target_id, freq, created_at) VALUES ($1, 'pattern', $2, 1, now())`,
              [languageId, targetId]
            )
          }
        }
      } catch (e) {
        // best-effort: don't block accept if metrics write fails
      }

      return updated as LoanFlagRecord
    }
  }
}
