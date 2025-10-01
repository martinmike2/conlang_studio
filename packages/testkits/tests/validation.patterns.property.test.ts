import { describe, it, expect } from "vitest"

import { validatePatternLegality } from "@core/morphology"
import { createCoreTestDb } from "./utils/morphologyTestUtils"
import * as schema from "../../db/schema/core"

const isNightly = process.env.NIGHTLY === "1" || process.env.NIGHTLY === "true"

// Simple deterministic LCG PRNG for reproducible tests
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function randomSkeleton(rng: () => number) {
  // placeholders: single uppercase letters, optionally with a digit (e.g., C, V2)
  const placeholders = ["C", "V", "N", "T", "S"]
  const vowels = ["a", "e", "i", "o", "u"]
  const parts: string[] = []
  const len = 3 + Math.floor(rng() * 6)
  for (let i = 0; i < len; i++) {
    if (rng() < 0.4) {
      const ph = placeholders[Math.floor(rng() * placeholders.length)]
      if (rng() < 0.2) parts.push(ph + String(1 + Math.floor(rng() * 3)))
      else parts.push(ph)
    } else {
      parts.push(vowels[Math.floor(rng() * vowels.length)])
    }
    if (i < len - 1 && rng() < 0.5) parts.push("-")
  }
  return parts.join("")
}

(isNightly ? describe : describe.skip)("Property: Pattern legality (slot count vs skeleton)", () => {
  it("matches detected slot counts for many random skeletons", async () => {
    const rng = makeRng(12345)
    const cases = 120
    for (let t = 0; t < cases; t++) {
      const { db, dispose } = await createCoreTestDb()
      try {
        const skeleton = randomSkeleton(rng)
        const detected = (skeleton.match(/[A-Z](?:\d+)?/g) || []).length

        // sometimes produce correct slotCount, sometimes off-by-1 or random
        const flip = rng()
        let slotCount = detected
        if (flip < 0.25) slotCount = Math.max(0, detected + 1)
        else if (flip < 0.45) slotCount = Math.max(0, detected - 1)
        else if (flip < 0.6) slotCount = detected + 2

        // insert pattern directly
  await db.insert(schema.patterns).values({ name: `p${t}`, skeleton, slotCount })

        const result = await validatePatternLegality(db as any)
        const mismatch = slotCount !== detected

        if (mismatch) {
          expect(result.status).toBe("fail")
          expect(result.findings.length).toBeGreaterThanOrEqual(1)
          const f = result.findings.find((x: any) => x.patternName === `p${t}` || x.skeleton === skeleton)
          expect(f).toBeDefined()
          if (f) {
            expect(f.detectedSlots).toBe(detected)
            expect(f.slotCount).toBe(slotCount)
          }
        } else {
          expect(result.status).toBe("pass")
          expect(result.findings.length).toBe(0)
        }
      } finally {
        await dispose()
      }
    }
  }, 200000)
})
