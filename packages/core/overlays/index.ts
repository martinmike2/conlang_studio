import { z } from 'zod'
export { applyOverlay, createOverlay, listOverlays, getOverlay, applyOverlayToLoanRules } from './service'
export type { OverlayOp, Rule, VariantOverlayRecord, Conflict } from './service'

// Zod runtime schemas for API validation and UI reuse
export const OverlayOpSchema = z.union([
  z.object({ action: z.literal('add'), id: z.number().int().optional(), pattern: z.string().min(1), replacement: z.string().min(0), priority: z.number().optional(), meta: z.record(z.unknown()).optional() }),
  z.object({ action: z.literal('update'), id: z.number().int(), pattern: z.string().optional(), replacement: z.string().optional(), priority: z.number().optional(), meta: z.record(z.unknown()).optional() }),
  z.object({ action: z.literal('remove'), id: z.number().int() })
])

export const OverlayCreateSchema = z.object({
  languageId: z.number().int().optional(),
  name: z.string().min(1),
  ops: z.array(OverlayOpSchema).optional().default([]),
  meta: z.record(z.unknown()).optional().default({})
})

export type OverlayCreate = z.infer<typeof OverlayCreateSchema>
export * from './service'
