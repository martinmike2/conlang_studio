import { describe, it, expect } from "vitest"

import { validateOrthographyRoundTrip } from "@core/validation"
import { orthographies, orthographySamples } from "../../db/schema/core"
import { createCoreTestDb } from "./utils/morphologyTestUtils"

async function withDb(run: (db: any) => Promise<void>) {
  const { db, dispose } = await createCoreTestDb()
  try {
    await run(db)
  } finally {
    await dispose()
  }
}

describe("Orthography round-trip validator", () => {
  it("passes when samples round-trip successfully", async () => {
    await withDb(async (db) => {
      const [orthography] = await db.insert(orthographies).values({
        name: "Standard",
        graphemeMap: { a: "A", b: "B" }
      }).returning()

      await db.insert(orthographySamples).values({
        orthographyId: orthography.id,
        surface: "ab",
        transliteration: "ab"
      })

    const result = await validateOrthographyRoundTrip(db as any)
      expect(result.status).toBe("pass")
      expect(result.failures).toHaveLength(0)
    })
  })

  it("fails when round-trip output differs", async () => {
    await withDb(async (db) => {
      const [orthography] = await db.insert(orthographies).values({
        name: "Alt",
        graphemeMap: { sh: "s", s: "s" }
      }).returning()

      await db.insert(orthographySamples).values({
        orthographyId: orthography.id,
        surface: "shs",
        transliteration: "ss"
      })

    const result = await validateOrthographyRoundTrip(db as any)
      expect(result.status).toBe("fail")
      expect(result.failures).toHaveLength(1)
      const failure = result.failures[0]
      expect(failure.surface).toBe("shs")
      expect(failure.roundTrip).toBe("shsh")
      expect(failure.roundTrip).not.toBe(failure.transliteration)
    })
  })
})
