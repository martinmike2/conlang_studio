import { describe, it, expect } from "vitest"

import {
  computeMetrics,
  getLatestSnapshot,
  metricsHash,
  triggerMetricsCollection
} from "@core/metrics"
import { createCoreTestDb } from "./utils/morphologyTestUtils"
import {
  lexemeSenses,
  patterns,
  rootPatternBindings,
  roots,
  semanticFrames
} from "../../db/schema/core"

async function seedMetricsDb(db: Awaited<ReturnType<typeof createCoreTestDb>>["db"]) {

  const [frame] = await db
    .insert(semanticFrames)
    .values({
      name: "Eval",
      slug: "eval",
      domain: "test",
      description: "metrics eval",
      roles: []
    })
    .returning()

  await db
    .insert(lexemeSenses)
    .values({ frameId: frame.id, gloss: "sample", definition: "sample def" })

  const [pattern] = await db
    .insert(patterns)
    .values({ name: "Pattern", skeleton: "C-a-C", slotCount: 2 })
    .returning()

  const [root] = await db
    .insert(roots)
    .values({ representation: "k-t", gloss: "write" })
    .returning()

  await db.insert(rootPatternBindings).values({ rootId: root.id, patternId: pattern.id, generatedForm: "kat" })
}

describe("Metrics exit validation", () => {
  it("exposes snapshots and avoids duplicate creation on repeated trigger", async () => {
    const { db, dispose } = await createCoreTestDb()

    try {
      await seedMetricsDb(db)

      const first = await triggerMetricsCollection(1, { force: true, versionRef: "first" }, db as any)
      expect(first.snapshot).toBeTruthy()

      const latestAfterFirst = await getLatestSnapshot(1, db as any)
      expect(latestAfterFirst?.id).toBe(first.snapshot?.id)

      const second = await triggerMetricsCollection(1, {}, db as any)
      expect(second.snapshot?.id).toBe(first.snapshot?.id)

      const third = await triggerMetricsCollection(1, { force: true, versionRef: "second" }, db as any)
      expect(third.snapshot?.id).not.toBe(first.snapshot?.id)

      const hash1 = metricsHash(first.snapshot!.metrics as any)
      const hash3 = metricsHash(third.snapshot!.metrics as any)
      expect(typeof hash1).toBe("string")
      expect(hash3.length).toBe(hash1.length)
    } finally {
      await dispose()
    }
  })
})
