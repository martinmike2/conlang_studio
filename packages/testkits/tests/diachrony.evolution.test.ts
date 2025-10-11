import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { createDiachronyTestHarness } from "./utils/diachronyTestUtils"
import type { EvolutionBatchInput } from "../../packages/core/diachrony/types"

describe("Diachrony Evolution Batch Job", () => {
  let testLanguageId: number
  let diachronyService: Awaited<ReturnType<typeof createDiachronyTestHarness>>["service"]
  let harness: Awaited<ReturnType<typeof createDiachronyTestHarness>>

  beforeEach(async () => {
    harness = await createDiachronyTestHarness()
    diachronyService = harness.service
    
    const { languages } = await import("../../db/schema/core")
    const [lang] = await harness.db.insert(languages).values({
      name: "Test Language",
      slug: "test-lang"
    }).returning()
    testLanguageId = lang.id
  })
  
  afterEach(async () => {
    if (harness) await harness.dispose()
  })

  it("executes dry-run without persisting changes", async () => {
    const input: EvolutionBatchInput = {
      languageId: testLanguageId,
      rules: [{
        id: "rule-1",
        type: "sound-change",
        description: "a > ɑ shift",
        enabled: true
      }],
      dryRun: true,
      seed: 12345
    }

    const result = await diachronyService.executeEvolutionBatch(input)

    expect(result.dryRun).toBe(true)
    expect(result.stats.changesApplied).toBe(0)
    
    const logs = await diachronyService.listLexicalChanges({ languageId: testLanguageId })
    expect(logs).toHaveLength(0)
  })

  it("produces deterministic results with same seed", async () => {
    const input: EvolutionBatchInput = {
      languageId: testLanguageId,
      rules: [{
        id: "rule-1",
        type: "sound-change",
        description: "Test rule",
        enabled: true
      }],
      dryRun: true,
      seed: 54321
    }

    const result1 = await diachronyService.executeEvolutionBatch(input)
    const result2 = await diachronyService.executeEvolutionBatch(input)

    expect(result1.changes).toEqual(result2.changes)
    expect(result1.stats).toEqual(result2.stats)
  })

  it("handles empty lexeme set gracefully", async () => {
    const input: EvolutionBatchInput = {
      languageId: testLanguageId,
      rules: [{
        id: "rule-1",
        type: "sound-change",
        description: "Test rule",
        enabled: true
      }],
      dryRun: true
    }

    const result = await diachronyService.executeEvolutionBatch(input)

    expect(result.stats.lexemesAffected).toBe(0)
    expect(result.stats.changesProposed).toBe(0)
    expect(result.warnings).toContain("No lexemes found to process")
  })
})

describe("Semantic Drift Taxonomy", () => {
  let testLanguageId: number
  let testSenseId: number
  let diachronyService: Awaited<ReturnType<typeof createDiachronyTestHarness>>["service"]
  let harness: Awaited<ReturnType<typeof createDiachronyTestHarness>>

  beforeEach(async () => {
    harness = await createDiachronyTestHarness()
    diachronyService = harness.service
    
    const { languages, semanticFrames, lexemeSenses } = await import("../../db/schema/core")
    
    const [lang] = await harness.db.insert(languages).values({
      name: "Test Language",
      slug: "test-lang"
    }).returning()
    testLanguageId = lang.id
    
    const [frame] = await harness.db.insert(semanticFrames).values({
      name: "Test Frame",
      slug: "test-frame",
      roles: []
    }).returning()
    
    const [sense] = await harness.db.insert(lexemeSenses).values({
      frameId: frame.id,
      gloss: "test"
    }).returning()
    testSenseId = sense.id
  })
  
  afterEach(async () => {
    if (harness) await harness.dispose()
  })

  it("accepts valid semantic shift types", async () => {
    const result = await diachronyService.recordSemanticDrift({
      languageId: testLanguageId,
      senseId: testSenseId,
      shiftType: "metaphor",
      note: "Test metaphor"
    })

    expect(result.shiftType).toBe("metaphor")
    expect(result.trigger).toHaveProperty("validatedTaxonomy", true)
  })

  it("rejects invalid semantic shift types", async () => {
    await expect(
      diachronyService.recordSemanticDrift({
        languageId: testLanguageId,
        senseId: testSenseId,
        shiftType: "invalid-type" as any,
        note: "Should fail"
      })
    ).rejects.toThrow(/Invalid shift type/)
  })
})

describe("Drift Heatmap", () => {
  let testLanguageId: number
  let diachronyService: Awaited<ReturnType<typeof createDiachronyTestHarness>>["service"]
  let harness: Awaited<ReturnType<typeof createDiachronyTestHarness>>

  beforeEach(async () => {
    harness = await createDiachronyTestHarness()
    diachronyService = harness.service
    
    const { languages } = await import("../../db/schema/core")
    const [lang] = await harness.db.insert(languages).values({
      name: "Test Language",
      slug: "test-lang"
    }).returning()
    testLanguageId = lang.id
    
    await diachronyService.recordSemanticShift({
      languageId: testLanguageId,
      shiftType: "metaphor",
      note: "Shift 1",
      trigger: { semanticField: "motion" }
    })
  })
  
  afterEach(async () => {
    if (harness) await harness.dispose()
  })

  it("generates heatmap grouped by month", async () => {
    const heatmap = await diachronyService.getDriftHeatmap({
      languageId: testLanguageId,
      groupBy: "month"
    })

    expect(heatmap.length).toBeGreaterThan(0)
    expect(heatmap[0]).toHaveProperty("semanticField")
    expect(heatmap[0]).toHaveProperty("period")
    expect(heatmap[0]).toHaveProperty("shiftCount")
  })

  it("normalizes intensity between 0 and 1", async () => {
    const heatmap = await diachronyService.getDriftHeatmap({
      languageId: testLanguageId,
      groupBy: "month"
    })

    expect(heatmap.every(entry => entry.intensity >= 0 && entry.intensity <= 1)).toBe(true)
  })
})
