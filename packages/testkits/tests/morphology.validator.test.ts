import { describe, it, expect } from "vitest"

import { validatePatternLegality } from "@core/morphology"
import { createMorphologyTestHarness } from "./utils/morphologyTestUtils"

describe("Morphology validators", () => {
  it("passes when slotCount matches skeleton placeholders", async () => {
    const { service, db, dispose } = await createMorphologyTestHarness()

    await service.createPattern({
      name: "Form I",
      skeleton: "C-a-C-a-C",
      slotCount: 3
    })

    const result = await validatePatternLegality(db as any)

    expect(result.status).toBe("pass")
    expect(result.findings).toHaveLength(0)
    expect(result.patternCount).toBe(1)

    await dispose()
  })

  it("detects mismatched slot counts", async () => {
    const { service, db, dispose } = await createMorphologyTestHarness()

    const pattern = await service.createPattern({
      name: "Form II",
      skeleton: "C-a-C",
      slotCount: 4
    })

    const result = await validatePatternLegality(db as any)

    expect(result.status).toBe("fail")
    expect(result.findings).toHaveLength(1)

    const finding = result.findings[0]
    expect(finding.patternId).toBe(pattern.id)
    expect(finding.detectedSlots).toBe(2)
    expect(finding.slotCount).toBe(4)
    expect(finding.skeleton).toBe("C-a-C")

    await dispose()
  })
})
