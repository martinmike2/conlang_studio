import { describe, it, expect } from "vitest"

import { applyOverlay, explainConflict } from "@core/overlays"
import { generateSynthetic } from "../synth/generator"

describe("overlay conflict synthetic cases", () => {
  it("flags conflicting ops across generated rule sets", () => {
    const synth = generateSynthetic({ phonemeCount: 5, lexemeCount: 0 })
    const base = synth.phonemes.map((p, index) => ({
      id: index + 1,
      pattern: p,
      replacement: `${p}'`,
      priority: (index + 1) * 10
    }))

    const ops = [
      { action: "add", pattern: synth.phonemes[0], replacement: "ALT", priority: 10 },
      { action: "update", id: 999, replacement: "invalid" },
      { action: "remove", id: 999 },
      { action: "add", pattern: "new-token", replacement: "target", priority: 5 }
    ] as const

    const result = applyOverlay(base as any, ops as any)

    expect(result.applied.some((rule) => rule.pattern === "new-token")).toBe(true)
    expect(result.applied).toHaveLength(base.length + 1)

    expect(result.conflicts).toHaveLength(3)
    expect(result.conflicts[0].reason).toMatch(/duplicate pattern/i)
    expect(result.conflicts[1].reason).toMatch(/does not exist/i)
    expect(result.conflicts[2].reason).toMatch(/does not exist/i)

    const message = explainConflict(result.conflicts[0])
    expect(message).toMatch(/Op #0/)
  })
})
