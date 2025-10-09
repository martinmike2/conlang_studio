import { describe, it, expect } from "vitest"
import { createCoreTestDb } from "./utils/morphologyTestUtils"
import { createBorrowingService } from "@core/borrowing/service"
import * as schema from "../../db/schema/core"

describe("Borrowing pipeline (smoke)", () => {
  it("creates a contact event and applies a simple ruleset", async () => {
    const { db, dispose } = await createCoreTestDb()
    try {
      const svc = createBorrowingService(db as any)

      const created = await svc.createContactEvent({ donorLanguage: "langA", recipientLanguage: "langB", sourceText: "tata" })
      expect(created).toHaveProperty("id")

      // insert a small ruleset and rule
  const [rs] = await db.insert(schema.loanRulesets).values({ name: "r1", description: "test" }).returning()
  await db.insert(schema.loanRules).values({ rulesetId: rs.id, priority: 1, pattern: "ta", replacement: "da" })

      const out = await svc.applyRuleset(rs.id, "tata")
      expect(out).toBe("dada")
    } finally {
      await dispose()
    }
  })
})
