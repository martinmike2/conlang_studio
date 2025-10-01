import { test } from "vitest"
import { performance } from "perf_hooks"

import { generateBinding } from "@core/morphology"

const MEASURE = process.env.MEASURE_STEM === "true"

if (!MEASURE) {
  test.skip("Measure stem generation (disabled)", () => {
    /* intentionally skipped unless MEASURE_STEM=true */
  })
} else {
  test(
    "measure stem generation p50/p95/p99",
    () => {
      const numRoots = 50
      const numPatterns = 20

      const consonants = ["k", "t", "b", "s", "m", "n", "l", "r", "p", "g"]
      const makeRoot = (i: number) => ({
        id: i + 1,
        representation: Array.from({ length: 3 }, (_, j) => consonants[(i + j) % consonants.length]).join("-"),
        createdAt: new Date()
      })

      const skeletons = [
        "C-a-C",
        "C1-i-C2",
        "C-a-C-a-C",
        "C-i-C",
        "C-e-C",
        "C-o-C",
        "C-a-Ca-C"
      ]

      const makePattern = (i: number) => ({ id: i + 100, skeleton: skeletons[i % skeletons.length], name: `pat-${i}` })

      const roots = Array.from({ length: numRoots }, (_, i) => makeRoot(i))
      const patterns = Array.from({ length: numPatterns }, (_, i) => makePattern(i))

      const times: number[] = []
      const totalStart = performance.now()
      for (const root of roots) {
        for (const pattern of patterns) {
          const t0 = performance.now()
          // run the generator (fast, in-memory)
          generateBinding(root as any, pattern as any)
          const t1 = performance.now()
          times.push(t1 - t0)
        }
      }
      const totalEnd = performance.now()
      const total = totalEnd - totalStart

      times.sort((a, b) => a - b)
      const percentile = (p: number) => {
        if (times.length === 0) return 0
        const idx = Math.min(times.length - 1, Math.floor((p / 100) * times.length))
        return times[idx]
      }

      const sum = times.reduce((a, b) => a + b, 0)
      const avg = times.length ? sum / times.length : 0

      // Print a concise report for later CI artifact capture
      // eslint-disable-next-line no-console
      console.log(
        `measure.stem: runs=${times.length} totalMs=${total.toFixed(2)} avgMs=${avg.toFixed(2)} p50=${percentile(
          50
        ).toFixed(2)} p95=${percentile(95).toFixed(2)} p99=${percentile(99).toFixed(2)}`
      )
    },
    // generous timeout for slow CI machines
    120_000
  )
}
