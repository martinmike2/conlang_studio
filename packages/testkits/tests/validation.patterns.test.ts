import { describe, it, expect } from "vitest"

import { validatePatternCompleteness } from "@core/validation"
import { patternSets, patternSetMembers, rootPatternRequirements, rootPatternBindings, patterns, roots } from "../../db/schema/core"
import { createCoreTestDb } from "./utils/morphologyTestUtils"

async function withDb(run: (db: any) => Promise<void>) {
  const { db, dispose } = await createCoreTestDb()
  try {
    await run(db)
  } finally {
    await dispose()
  }
}

describe("Pattern completeness validator", () => {
  it("passes when roots have required patterns bound", async () => {
    await withDb(async (db) => {
  const [set] = await db.insert(patternSets).values({ name: "SetA" }).returning()
  const [pattern] = await db.insert(patterns).values({ name: "FormX", skeleton: "C-a-C", slotCount: 3 }).returning()
  await db.insert(patternSetMembers).values({ patternSetId: set.id, patternId: pattern.id })
  const [rootRow] = await db.insert(roots).values({ representation: "r1", gloss: "root1" }).returning()
  await db.insert(rootPatternRequirements).values({ rootId: rootRow.id, patternSetId: set.id })
  await db.insert(rootPatternBindings).values({ rootId: rootRow.id, patternId: pattern.id })

      const result = await validatePatternCompleteness(db as any)
      expect(result.status).toBe("pass")
      expect(result.failures).toHaveLength(0)
    })
  })

  it("fails when required pattern bindings are missing", async () => {
    await withDb(async (db) => {
  const [set] = await db.insert(patternSets).values({ name: "SetB" }).returning()
  const [pattern] = await db.insert(patterns).values({ name: "FormY", skeleton: "C-a", slotCount: 2 }).returning()
  await db.insert(patternSetMembers).values({ patternSetId: set.id, patternId: pattern.id })
  const [rootRow] = await db.insert(roots).values({ representation: "r2", gloss: "root2" }).returning()
  await db.insert(rootPatternRequirements).values({ rootId: rootRow.id, patternSetId: set.id })
      // no binding for rootId 2

      const result = await validatePatternCompleteness(db as any)
      expect(result.status).toBe("fail")
      expect(result.failures.length).toBeGreaterThan(0)
      const failure = result.failures[0]
  expect(failure.rootId).toBe(rootRow.id)
      expect(failure.patternSetId).toBe(set.id)
  expect(failure.requiredPatternIds).toContain(pattern.id)
    })
  })
})
