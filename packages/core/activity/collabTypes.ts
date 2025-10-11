import { z } from 'zod'

/**
 * Zod schemas for collaboration service validation
 */

export const createSessionInputSchema = z.object({
  languageId: z.number().int().positive().optional(),
  ownerId: z.string().min(1).optional()
})

export const appendEventInputSchema = z.object({
  sessionId: z.number().int().positive(),
  actorId: z.string().min(1).optional(),
  clientSeq: z.number().int().nonnegative().optional(),
  payload: z.record(z.unknown()).optional(),
  hash: z.string().optional()
})

export const listEventsInputSchema = z.object({
  sessionId: z.number().int().positive(),
  sinceServerSeq: z.number().int().nonnegative().optional()
})

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>
export type AppendEventInput = z.infer<typeof appendEventInputSchema>
export type ListEventsInput = z.infer<typeof listEventsInputSchema>
