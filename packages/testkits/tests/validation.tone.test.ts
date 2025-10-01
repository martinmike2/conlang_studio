import { describe, it, expect } from "vitest"

import { validateToneAssociations } from "@core/validation"
import { toneTargets, toneAssociations } from "../../db/schema/core"
import { createCoreTestDb } from "./utils/morphologyTestUtils"

async function withDb(run: (db: any) => Promise<void>) {
  const { db, dispose } = await createCoreTestDb()
  try {
    await run(db)
  } finally {
    await dispose()
  }
}

describe("Tone association validator", () => {
  it("passes when every target has exactly one association", async () => {
    await withDb(async (db) => {
      const [target] = await db.insert(toneTargets).values({ lexemeId: 1, slotIndex: 0 }).returning()
      await db.insert(toneAssociations).values({ targetId: target.id, tone: "H" })

    const result = await validateToneAssociations(db as any)
      expect(result.status).toBe("pass")
      expect(result.issues).toHaveLength(0)
    })
  })

  it("detects stranded and duplicate associations", async () => {
    await withDb(async (db) => {
      const [missing] = await db.insert(toneTargets).values({ lexemeId: 2, slotIndex: 1 }).returning()
      const [duplicate] = await db.insert(toneTargets).values({ lexemeId: 3, slotIndex: 2 }).returning()
      await db.insert(toneAssociations).values({ targetId: duplicate.id, tone: "L" })
      await db.insert(toneAssociations).values({ targetId: duplicate.id, tone: "HL" })

    const result = await validateToneAssociations(db as any)
      expect(result.status).toBe("fail")
      expect(result.strandedTargets).toBe(1)
      expect(result.duplicateTargets).toBe(1)
      expect(result.danglingAssociations).toBe(0)

      expect(result.issues.some((issue) => issue.type === "missing" && issue.targetId === missing.id)).toBe(true)
      expect(result.issues.some((issue) => issue.type === "duplicate" && issue.targetId === duplicate.id)).toBe(true)
    })
  })
})
