import { desc, and, eq, lt, type InferInsertModel, type InferSelectModel } from "drizzle-orm"
import { getDb } from "../../db/client"
import { activityLog } from "../../db/schema/core"
import { logger } from "../logger"

export type ActivityLogRecord = InferSelectModel<typeof activityLog>
export type ActivityLogInsert = InferInsertModel<typeof activityLog>

type DbClient = ReturnType<typeof getDb>

export interface RecordActivityInput {
  scope: string
  action: string
  summary: string
  entity?: string | null
  actor?: string | null
  frameId?: number | null
  senseId?: number | null
  idiomId?: number | null
  payload?: Record<string, unknown>
}

export interface ListActivityOptions {
  limit?: number
  cursor?: number
  scope?: string
}

export interface ActivityListResult {
  entries: ActivityLogRecord[]
  nextCursor: number | null
}

type ActivitySubscriber = (entry: ActivityLogRecord) => void

const subscribers = new Set<ActivitySubscriber>()

export function subscribeActivity(fn: ActivitySubscriber): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function clearActivitySubscribers() {
  subscribers.clear()
}

function emit(entry: ActivityLogRecord) {
  for (const subscriber of subscribers) {
    try {
      subscriber(entry)
    } catch (err) {
      logger.warn({ err, entry }, "activity subscriber threw")
    }
  }
}

export async function recordActivity(input: RecordActivityInput, db: DbClient = getDb()): Promise<ActivityLogRecord> {
  const insert: ActivityLogInsert = {
    scope: input.scope,
    action: input.action,
    summary: input.summary,
    entity: input.entity ?? null,
    actor: input.actor ?? null,
    frameId: input.frameId ?? null,
    senseId: input.senseId ?? null,
    idiomId: input.idiomId ?? null,
    payload: input.payload ?? {}
  }

  const [created] = await db.insert(activityLog).values(insert).returning()
  if (!created) {
    throw new Error("Failed to insert activity log entry")
  }

  emit(created)
  return created
}

export async function listActivity(options: ListActivityOptions = {}, db: DbClient = getDb()): Promise<ActivityListResult> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  const conditions = []
  if (options.scope) {
    conditions.push(eq(activityLog.scope, options.scope))
  }
  if (options.cursor) {
    conditions.push(lt(activityLog.id, options.cursor))
  }

  let query = db.select().from(activityLog).$dynamic()
  if (conditions.length === 1) {
    query = query.where(conditions[0])
  } else if (conditions.length > 1) {
    query = query.where(and(...conditions))
  }

  const rows = await query
    .orderBy(desc(activityLog.occurredAt), desc(activityLog.id))
    .limit(limit + 1)

  const entries = rows.slice(0, limit)
  const nextCursor = rows.length > limit ? rows[rows.length - 1]?.id ?? null : null

  return { entries, nextCursor }
}
