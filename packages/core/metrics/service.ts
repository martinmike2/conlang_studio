import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm"
import { createHash } from "node:crypto"
import { getDb } from "../../db/client"
import {
  complexitySnapshots,
  lexemeSenses,
  metricsJobs,
  patterns,
  rootPatternBindings
} from "../../db/schema/core"
import { clusterComplexity } from "./clusterComplexity"
import { metrics as metricsRegistry } from "./registry"

type DbClient = ReturnType<typeof getDb>

export type MetricsSnapshotRecord = typeof complexitySnapshots.$inferSelect
export type MetricsJobRecord = typeof metricsJobs.$inferSelect

export type MetricsMap = Record<string, number>

export interface MetricsJobOptions {
  debounceMs?: number
  force?: boolean
  payload?: Record<string, unknown>
  versionRef?: string | null
}

const DEFAULT_LANGUAGE_ID = 1
const DEFAULT_DEBOUNCE_MS = 5 * 60 * 1000

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Number(value.toFixed(3))
}

async function calculateArticulatoryLoad(db: DbClient): Promise<number> {
  const rows = await db
    .select({ generatedForm: rootPatternBindings.generatedForm })
    .from(rootPatternBindings)
    .where(isNotNull(rootPatternBindings.generatedForm))

  const forms = rows.map((row) => row.generatedForm!).filter(Boolean)
  if (forms.length === 0) {
    const patternRows = await db.select({ skeleton: patterns.skeleton }).from(patterns)
    if (patternRows.length === 0) {
      return 0
    }
    const skeletonLengths = patternRows.map((row) => row.skeleton.replace(/[^a-zA-Zʃʒθðχʁ]/g, "").length || row.skeleton.length)
    const avgSkeleton = skeletonLengths.reduce((acc, len) => acc + len, 0) / skeletonLengths.length
    return roundMetric(Math.min(avgSkeleton * 4, 100))
  }

  const lengths = forms.map((form) => form.replace(/[^a-zA-Zʃʒθðχʁ]/g, "").length || form.length)
  const avgLength = lengths.reduce((acc, len) => acc + len, 0) / lengths.length
  const articulationScore = Math.min(avgLength * 3.5, 100)
  return roundMetric(articulationScore)
}

async function calculateHomophonyDensity(db: DbClient): Promise<number> {
  const senses = await db.select({ gloss: lexemeSenses.gloss }).from(lexemeSenses)
  if (senses.length === 0) {
    return 0
  }

  const counts = new Map<string, number>()
  for (const { gloss } of senses) {
    const key = (gloss ?? "").trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  let duplicates = 0
  for (const value of counts.values()) {
    if (value > 1) {
      duplicates += value - 1
    }
  }

  const density = duplicates / senses.length
  return roundMetric(Math.min(density * 100, 100))
}

function extractClustersFromSkeleton(skeleton: string): string[][] {
  if (!skeleton) {
    return []
  }

  const sanitized = skeleton.replace(/[0-9'_]/g, " ")
  const tokens = sanitized.split(/[^a-zA-Zʃʒθðχʁ]+/).map((token) => token.trim()).filter(Boolean)
  const clusters: string[][] = []
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (!lower) continue
    const chars = lower.split("").filter(Boolean)
    if (chars.length === 0) continue
    clusters.push(chars)
  }
  return clusters
}

async function calculateClusterComplexityMetric(db: DbClient): Promise<number> {
  const patternRows = await db.select({ skeleton: patterns.skeleton }).from(patterns)
  if (patternRows.length === 0) {
    return 0
  }
  const clusters = patternRows.flatMap((row) => extractClustersFromSkeleton(row.skeleton))
  if (clusters.length === 0) {
    return 0
  }
  return roundMetric(clusterComplexity(clusters))
}

export async function computeMetrics(languageId: number = DEFAULT_LANGUAGE_ID, db: DbClient = getDb()): Promise<MetricsMap> {
  const [articulatoryLoad, homophonyDensity, clusterScore] = await Promise.all([
    calculateArticulatoryLoad(db),
    calculateHomophonyDensity(db),
    calculateClusterComplexityMetric(db)
  ])

  const counterSnapshot = metricsRegistry.snapshot().counters ?? {}

  return {
    articulatoryLoad,
    homophonyDensity,
    clusterComplexity: clusterScore,
    borrowingInvalidPatternCount: counterSnapshot['borrowing.invalid_pattern'] ?? 0,
    borrowingRegexWorkerTimeouts: counterSnapshot['borrowing.regex_worker_timeout'] ?? 0,
    borrowingRegexWorkerErrors: counterSnapshot['borrowing.regex_worker_error'] ?? 0,
    borrowingSkippedPatterns: counterSnapshot['borrowing.skipped_pattern_too_long'] ?? 0
  }
}

export function metricsHash(metrics: MetricsMap): string {
  const orderedEntries = Object.keys(metrics)
    .sort()
    .map((key) => [key, metrics[key]])
  const json = JSON.stringify(orderedEntries)
  return createHash("sha256").update(json).digest("hex")
}

export async function recordMetricsSnapshot(
  languageId: number = DEFAULT_LANGUAGE_ID,
  options: { metrics?: MetricsMap; versionRef?: string | null } = {},
  db: DbClient = getDb()
): Promise<MetricsSnapshotRecord> {
  const metrics = options.metrics ?? (await computeMetrics(languageId, db))
  const [snapshot] = await db
    .insert(complexitySnapshots)
    .values({
      languageId,
      versionRef: options.versionRef ?? null,
      metrics
    })
    .returning()
  return snapshot
}

export async function getLatestSnapshot(languageId: number = DEFAULT_LANGUAGE_ID, db: DbClient = getDb()): Promise<MetricsSnapshotRecord | null> {
  const rows = await db
    .select()
    .from(complexitySnapshots)
    .where(eq(complexitySnapshots.languageId, languageId))
    .orderBy(desc(complexitySnapshots.createdAt))
    .limit(1)
  return rows[0] ?? null
}

export async function getSnapshotHistory(
  languageId: number = DEFAULT_LANGUAGE_ID,
  limit = 20,
  db: DbClient = getDb()
): Promise<MetricsSnapshotRecord[]> {
  const rows = await db
    .select()
    .from(complexitySnapshots)
    .where(eq(complexitySnapshots.languageId, languageId))
    .orderBy(desc(complexitySnapshots.createdAt))
    .limit(limit)
  return rows
}

export async function listRecentMetricsJobs(
  languageId: number = DEFAULT_LANGUAGE_ID,
  limit = 10,
  db: DbClient = getDb()
): Promise<MetricsJobRecord[]> {
  const rows = await db
    .select()
    .from(metricsJobs)
    .where(eq(metricsJobs.languageId, languageId))
    .orderBy(desc(metricsJobs.createdAt))
    .limit(limit)
  return rows
}

export async function enqueueMetricsJob(
  languageId: number = DEFAULT_LANGUAGE_ID,
  options: MetricsJobOptions = {},
  db: DbClient = getDb()
): Promise<{ job: MetricsJobRecord; created: boolean }> {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const now = new Date()
  const cutoff = new Date(now.getTime() - debounceMs)

  if (!options.force) {
    const existing = await db
      .select()
      .from(metricsJobs)
      .where(
        and(
          eq(metricsJobs.languageId, languageId),
          or(
            eq(metricsJobs.status, "pending"),
            eq(metricsJobs.status, "running"),
            and(eq(metricsJobs.status, "succeeded"), sql`${metricsJobs.finishedAt} IS NOT NULL AND ${metricsJobs.finishedAt} > ${cutoff}`)
          )
        )
      )
      .orderBy(desc(metricsJobs.createdAt))
      .limit(1)

    if (existing.length > 0) {
      return { job: existing[0], created: false }
    }
  }

  const [job] = await db
    .insert(metricsJobs)
    .values({
      languageId,
      status: "pending",
      payload: options.payload ?? {},
      createdAt: now
    })
    .returning()

  return { job, created: true }
}

export async function runMetricsJob(
  jobId: number,
  options: { versionRef?: string | null } = {},
  db: DbClient = getDb()
): Promise<{ job: MetricsJobRecord; snapshot: MetricsSnapshotRecord }> {
  const rows = await db.select().from(metricsJobs).where(eq(metricsJobs.id, jobId)).limit(1)
  const job = rows[0]
  if (!job) {
    throw new Error(`Metrics job ${jobId} not found`)
  }

  if (job.status === "running") {
    throw new Error(`Metrics job ${jobId} is already running`)
  }

  const start = new Date()
  await db.update(metricsJobs).set({ status: "running", startedAt: start }).where(eq(metricsJobs.id, jobId))

  try {
    const metrics = await computeMetrics(job.languageId, db)
    const snapshot = await recordMetricsSnapshot(job.languageId, { metrics, versionRef: options.versionRef ?? null }, db)
    const finish = new Date()

    await db
      .update(metricsJobs)
      .set({
        status: "succeeded",
        finishedAt: finish,
        payload: {
          ...(job.payload ?? {}),
          metrics
        }
      })
      .where(eq(metricsJobs.id, jobId))

    const duration = finish.getTime() - start.getTime()
    metricsRegistry.histogram("metrics.job.duration.ms").observe(duration)
    metricsRegistry.counter("metrics.job.success").inc()

    return {
      job: {
        ...job,
        status: "succeeded",
        startedAt: start,
        finishedAt: finish,
        payload: {
          ...(job.payload ?? {}),
          metrics
        }
      },
      snapshot
    }
  } catch (error) {
    const finish = new Date()
    await db
      .update(metricsJobs)
      .set({
        status: "failed",
        finishedAt: finish,
        payload: {
          ...(job.payload ?? {}),
          error: String(error)
        }
      })
      .where(eq(metricsJobs.id, jobId))
    metricsRegistry.counter("metrics.job.failure").inc()
    throw error
  }
}

export async function triggerMetricsCollection(
  languageId: number = DEFAULT_LANGUAGE_ID,
  options: MetricsJobOptions = {},
  db: DbClient = getDb()
): Promise<{ job: MetricsJobRecord; snapshot?: MetricsSnapshotRecord | null }> {
  const { job, created } = await enqueueMetricsJob(languageId, options, db)

  if (created || job.status === "pending") {
    const { snapshot, job: updatedJob } = await runMetricsJob(job.id, { versionRef: options.versionRef ?? null }, db)
    return { job: updatedJob, snapshot }
  }

  if (job.status === "succeeded") {
    const snapshot = await getLatestSnapshot(languageId, db)
    return { job, snapshot }
  }

  return { job, snapshot: null }
}
