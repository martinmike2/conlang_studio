import { describe, it, expect } from "vitest"

import { validatePatternLegality } from "@core/morphology"
import { createCoreTestDb } from "./utils/morphologyTestUtils"
import * as schema from "../../db/schema/core"

// Short deterministic LCG PRNG for reproducible tests
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function randomSkeleton(rng: () => number) {
  const placeholders = ["C", "V", "N", "T", "S"]
  const vowels = ["a", "e", "i", "o", "u"]
  const parts: string[] = []
  const len = 3 + Math.floor(rng() * 4)
  for (let i = 0; i < len; i++) {
    if (rng() < 0.4) {
      const ph = placeholders[Math.floor(rng() * placeholders.length)]
      if (rng() < 0.2) parts.push(ph + String(1 + Math.floor(rng() * 2)))
      else parts.push(ph)
    } else {
      parts.push(vowels[Math.floor(rng() * vowels.length)])
    }
    if (i < len - 1 && rng() < 0.5) parts.push("-")
  }
  return parts.join("")
}

describe("Smoke-Property: Pattern legality (short run)", () => {
  it("quickly checks detected slot counts for random skeletons", async () => {
    const rng = makeRng(12345)
    const cases = 12
    const { db, dispose } = await createCoreTestDb()
    try {
      for (let t = 0; t < cases; t++) {
        const skeleton = randomSkeleton(rng)
        const detected = (skeleton.match(/[A-Z](?:\d+)?/g) || []).length

        const flip = rng()
        let slotCount = detected
        if (flip < 0.25) slotCount = Math.max(0, detected + 1)
        else if (flip < 0.45) slotCount = Math.max(0, detected - 1)

  // Ensure each iteration runs against a clean set of patterns so
  // findings from earlier iterations don't influence the current check.
  await db.delete(schema.patterns)
  await db.insert(schema.patterns).values({ name: `p${t}`, skeleton, slotCount })

  const result = await validatePatternLegality(db as any)
        const mismatch = slotCount !== detected

        if (mismatch) {
          expect(result.status).toBe("fail")
        } else {
          expect(result.status).toBe("pass")
        }
      }
    } finally {
      await dispose()
    }
  }, 30000)
})
