import { afterEach, describe, expect, it } from "vitest"

import {
  computeMetrics,
  getLatestSnapshot,
  getSnapshotHistory,
  listRecentMetricsJobs,
  metrics,
  metricsHash,
  recordMetricsSnapshot,
  triggerMetricsCollection
} from "@core/metrics"
import {
  lexemeSenses,
  patterns,
  rootPatternBindings,
  roots,
  semanticFrames
} from "../../db/schema/core"
import { createCoreTestDb } from "./utils/morphologyTestUtils"

async function seedBaselineData(db: Awaited<ReturnType<typeof createCoreTestDb>>["db"]) {
  const [frame] = await db
    .insert(semanticFrames)
    .values({
      name: "Commerce",
      slug: "commerce",
      domain: "test",
      description: "Commerce frame",
      roles: [
        { name: "buyer", cardinality: "single", order: 0 },
        { name: "seller", cardinality: "single", order: 1 }
      ]
    })
    .returning()

  await db
    .insert(lexemeSenses)
    .values({
      frameId: frame.id,
      gloss: "trade",
      definition: "to trade goods"
    })

  const [pattern] = await db
    .insert(patterns)
    .values({
      name: "Form I",
      skeleton: "C-a-C-a-C",
      slotCount: 3
    })
    .returning()

  const [root] = await db
    .insert(roots)
    .values({
      representation: "k-t-b",
      gloss: "write"
    })
    .returning()

  await db.insert(rootPatternBindings).values({
    rootId: root.id,
    patternId: pattern.id,
    generatedForm: "katab"
  })
}

describe("metrics service", () => {
  afterEach(() => {
    metrics.resetAll()
  })

  it("computes metrics and records snapshots", async () => {
    const { db, dispose } = await createCoreTestDb()

    try {
      await seedBaselineData(db)

  const result = await computeMetrics(1, db as any)
  expect(result.articulatoryLoad).toBeGreaterThanOrEqual(0)
  expect(result.articulatoryLoad).toBeLessThanOrEqual(100)
  expect(result.homophonyDensity).toBe(0)
  expect(result.clusterComplexity).toBeGreaterThanOrEqual(0)
  expect(result.borrowingInvalidPatternCount).toBe(0)
  expect(result.borrowingRegexWorkerTimeouts).toBe(0)
  expect(result.borrowingRegexWorkerErrors).toBe(0)
  expect(result.borrowingSkippedPatterns).toBe(0)

  const snapshot = await recordMetricsSnapshot(1, { metrics: result }, db as any)
      expect(snapshot.languageId).toBe(1)
  expect(snapshot.metrics.articulatoryLoad).toBe(result.articulatoryLoad)

      const latest = await getLatestSnapshot(1, db as any)
      expect(latest?.id).toBe(snapshot.id)

      const history = await getSnapshotHistory(1, 5, db as any)
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe(snapshot.id)
    } finally {
      await dispose()
    }
  })

  it("enqueues and runs metrics jobs with debounce", async () => {
    const { db, dispose } = await createCoreTestDb()

    try {
      await seedBaselineData(db)

      const first = await triggerMetricsCollection(1, { force: true }, db as any)
      expect(first.snapshot).toBeTruthy()
      expect(first.job.status).toBe("succeeded")

      const again = await triggerMetricsCollection(1, {}, db as any)
      expect(again.job.id).toBe(first.job.id)
      expect(again.snapshot?.id).toBe(first.snapshot?.id)

      const jobs = await listRecentMetricsJobs(1, 10, db as any)
      expect(jobs).toHaveLength(1)
      expect(jobs[0].status).toBe("succeeded")
    } finally {
      await dispose()
    }
  })

  it("captures borrowing regex safety counters", async () => {
    const { db, dispose } = await createCoreTestDb()

    try {
      await seedBaselineData(db)

      metrics.counter("borrowing.invalid_pattern").inc(2)
      metrics.counter("borrowing.regex_worker_timeout").inc()
      metrics.counter("borrowing.regex_worker_error").inc(3)
      metrics.counter("borrowing.skipped_pattern_too_long").inc(4)

      const result = await computeMetrics(1, db as any)
      expect(result.borrowingInvalidPatternCount).toBe(2)
      expect(result.borrowingRegexWorkerTimeouts).toBe(1)
      expect(result.borrowingRegexWorkerErrors).toBe(3)
      expect(result.borrowingSkippedPatterns).toBe(4)
    } finally {
      await dispose()
    }
  })

  it("produces a stable snapshot hash when rerun without changes", async () => {
    const { db, dispose } = await createCoreTestDb()

    try {
      await seedBaselineData(db)

      const first = await triggerMetricsCollection(1, { force: true, versionRef: "run-1" }, db as any)
      const second = await triggerMetricsCollection(1, { force: true, versionRef: "run-2" }, db as any)

      expect(first.snapshot).toBeTruthy()
      expect(second.snapshot).toBeTruthy()

      const hash1 = metricsHash(first.snapshot!.metrics as any)
      const hash2 = metricsHash(second.snapshot!.metrics as any)

      expect(hash1).toBe(hash2)
    } finally {
      await dispose()
    }
  })
})
