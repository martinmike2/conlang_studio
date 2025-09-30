import { describe, it, expect } from "vitest"

import { generateBinding } from "@core/morphology"

const root = {
  id: 1,
  representation: "k-t-b",
  gloss: "to write",
  createdAt: new Date()
} as const

const pattern = {
  id: 2,
  name: "Form I",
  skeleton: "C-a-C-a-C",
  slotCount: 3,
  createdAt: new Date()
} as const

describe("generateBinding", () => {
  it("fills consonant slots with root consonants", () => {
    const binding = generateBinding(root, pattern)

    expect(binding.surfaceForm).toBe("katab")
    expect(binding.segments).toEqual(["k", "a", "t", "a", "b"])
    expect(binding.definitions).toEqual([
      { slotIndex: 0, placeholder: "C" },
      { slotIndex: 1, placeholder: "C" },
      { slotIndex: 2, placeholder: "C" }
    ])
  })

  it("supports indexed placeholders and custom formatter", () => {
    const indexedPattern = {
      ...pattern,
      skeleton: "C1-i-C2-a-C3"
    }

    const binding = generateBinding(root, indexedPattern, {
      stemFormatter: (segments) => segments.join("-")
    })

    expect(binding.surfaceForm).toBe("k-i-t-a-b")
    expect(binding.segments).toEqual(["k", "i", "t", "a", "b"])
    expect(binding.definitions).toEqual([
      { slotIndex: 0, placeholder: "C1" },
      { slotIndex: 1, placeholder: "C2" },
      { slotIndex: 2, placeholder: "C3" }
    ])
  })

  it("falls back to default vowel if root is short", () => {
    const shortRoot = {
      ...root,
      representation: "s-m"
    }

    const binding = generateBinding(shortRoot, pattern)
    expect(binding.surfaceForm).toBe("samam")
    expect(binding.segments).toEqual(["s", "a", "m", "a", "m"])
  })
})
