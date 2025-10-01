import { describe, it, expect } from "vitest"

import { validateIncompleteRoleFilling, validateOrphanSenses } from "@core/semantics"
import { createSemanticsTestHarness } from "./utils/semanticsTestUtils"
import * as schema from "../../db/schema/core"

const isNightly = process.env.NIGHTLY === "1" || process.env.NIGHTLY === "true"

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

;(isNightly ? describe : describe.skip)("Property: Semantics role coverage and orphan detection", () => {
  it("generates frames and relations and checks validators", async () => {
    const rng = makeRng(424242)
    const iterations = 60
    for (let i = 0; i < iterations; i++) {
      const { service, db, dispose } = await createSemanticsTestHarness()
      try {
        // create a frame with 0-3 required roles
        const roleCount = Math.floor(rng() * 4)
        const roles = [] as any[]
        for (let r = 0; r < roleCount; r++) {
          roles.push({ name: `R${r}`, cardinality: rng() < 0.5 ? "1" : "1..n" })
        }

        const frame = await service.createFrame({
          name: `F${i}`,
          slug: `f${i}`,
          domain: "test",
          description: "property test",
          roles
        })

        // create predicate and some candidate role fillers
        const predicate = await service.createSense({ frameId: frame.id, gloss: "pred", definition: "pred" })
        const fillers: any[] = []
        const fillerCount = 1 + Math.floor(rng() * 4)
        for (let f = 0; f < fillerCount; f++) {
          const s = await service.createSense({ frameId: frame.id, gloss: `s${f}`, definition: `s${f}` })
          fillers.push(s)
        }

        // randomly assign some role relations
        for (const role of roles) {
          if (rng() < 0.6) {
            // pick a random filler
            const chosen = fillers[Math.floor(rng() * fillers.length)]
            await db.insert(schema.senseRelations).values({ sourceSenseId: predicate.id, targetSenseId: chosen.id, relationType: `role:${role.name}` })
          }
        }

        // sometimes create orphan senses
        if (rng() < 0.3) {
          await service.createSense({ frameId: frame.id, gloss: "orphan", definition: "orphan" })
        }

        const roleResult = await validateIncompleteRoleFilling(db as any)
        const orphanResult = await validateOrphanSenses(db as any)

        // Basic consistency checks: counts are numeric and status is pass/fail
        expect(["pass", "fail"]).toContain(roleResult.status)
        expect(typeof roleResult.framesChecked).toBe("number")
        expect(["pass", "fail"]).toContain(orphanResult.status)
        expect(typeof orphanResult.totalSenses).toBe("number")

      } finally {
        await dispose()
      }
    }
  }, 120000)
})
