import { describe, it, expect } from "vitest"

import { assessAdaptationCompleteness, createBorrowingService } from "@core/borrowing/service"
import { createCoreTestDb } from "./utils/morphologyTestUtils"
import * as schema from "../../db/schema/core"

describe("Borrowing adaptation completeness", () => {
  it("reports complete coverage when targeted foreign segments are replaced", async () => {
    const { db, dispose } = await createCoreTestDb()

    try {
      const svc = createBorrowingService(db as any)
      const [ruleset] = await db
        .insert(schema.loanRulesets)
        .values({ name: "aspiration", description: "strip aspiration" })
        .returning()

      await db
        .insert(schema.loanRules)
        .values({ rulesetId: ruleset.id, priority: 1, pattern: "ʰ", replacement: "" })

      const donor = "kʰata"
      const adapted = await svc.applyRuleset(ruleset.id, donor)

      const result = svc.assessAdaptationCompleteness(donor, adapted, {
        focusSegments: ["ʰ"]
      })

      expect(adapted).toBe("kata")
      expect(result.complete).toBe(true)
      expect(result.coverage).toBe(1)
      expect(result.uncovered).toHaveLength(0)
    } finally {
      await dispose()
    }
  })

  it("identifies uncovered segments when adaptation is incomplete", () => {
    const donor = "kʰata"
    const adapted = donor

    const result = assessAdaptationCompleteness(donor, adapted, {
      focusSegments: ["ʰ"]
    })

    expect(result.complete).toBe(false)
    expect(result.coverage).toBe(0)
    expect(result.uncovered).toEqual([{ token: "ʰ", count: 1 }])
  })
})
