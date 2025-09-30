import { NextRequest } from "next/server"
import { z } from "zod"
import { listActivity } from "@core/activity"
import { success, jsonError } from "../_util/respond"

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  scope: z.string().min(1).optional()
})

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return jsonError(parsed.error.errors.map((e) => e.message).join("; "), 400)
  }

  const { limit, cursor, scope } = parsed.data
  const result = await listActivity({ limit, cursor, scope })
  const entries = result.entries.map((entry) => ({
    ...entry,
    occurredAt:
      entry.occurredAt instanceof Date ? entry.occurredAt.toISOString() : entry.occurredAt
  }))

  return success({ entries, nextCursor: result.nextCursor })
}
