import { describe, it, expect } from "vitest"
import { performance } from "node:perf_hooks"

import { createBorrowingService } from "@core/borrowing/service"
import { createCoreTestDb } from "./utils/morphologyTestUtils"
import * as schema from "../../db/schema/core"

function computeP95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor(0.95 * (sorted.length - 1)))
  return sorted[index]
}

describe("Borrowing pipeline performance", () => {
  it("maintains p95 under 2s for small intake dataset", async () => {
    const { db, dispose } = await createCoreTestDb()

    try {
      const svc = createBorrowingService(db as any)
      const [ruleset] = await db
        .insert(schema.loanRulesets)
        .values({ name: "lenition", description: "simple test ruleset" })
        .returning()

      await db
        .insert(schema.loanRules)
        .values({ rulesetId: ruleset.id, priority: 1, pattern: "t", replacement: "d" })

      const runs = 25
      const durations: number[] = []

      for (let i = 0; i < runs; i += 1) {
        const donorLanguage = `lang-${i}`
        const start = performance.now()
        await svc.createContactEvent({
          donorLanguage,
          recipientLanguage: "target",
          sourceText: "tata"
        })
        await svc.applyRuleset(ruleset.id, "tata")
        const end = performance.now()
        durations.push(end - start)
      }

      const p95 = computeP95(durations)
      expect(p95).toBeLessThan(2000)
    } finally {
      await dispose()
    }
  })
})
