import { describe, it, expect } from "vitest"

import {
  parseReduplicationTemplateSpec,
  stringifyReduplicationTemplateSpec,
  validateReduplicationTemplateSpec
} from "@core/morphology"
import type { ReduplicationTemplateSpecV1 } from "@core/morphology"

describe("Reduplication template spec v1", () => {
  it("accepts a full prefix template", () => {
    const spec: ReduplicationTemplateSpecV1 = {
      version: 1,
      base: "stem" as const,
      placement: "prefix" as const,
      copy: { mode: "full" as const },
      joiner: "-"
    }

    const result = validateReduplicationTemplateSpec(spec)
    expect(result.valid).toBe(true)
    expect(result.valid && result.spec).toEqual({
      version: 1,
      base: "stem",
      placement: "prefix",
      copy: { mode: "full" },
      joiner: "-",
      augment: undefined
    })

  const serialized = stringifyReduplicationTemplateSpec(result.valid ? result.spec : spec)
  const roundTrip = parseReduplicationTemplateSpec(serialized)
    expect(roundTrip.valid).toBe(true)
  })

  it("accepts a partial suffix template with augment", () => {
    const spec: ReduplicationTemplateSpecV1 = {
      version: 1,
      base: "root" as const,
      placement: "suffix" as const,
      copy: { mode: "partial" as const, segments: 2, scope: "initial" as const },
      augment: { prefix: ["ma"], suffix: ["na"] }
    }

    const result = validateReduplicationTemplateSpec(spec)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.spec.copy).toEqual({ mode: "partial", segments: 2, scope: "initial" })
      expect(result.spec.augment).toEqual({ prefix: ["ma"], suffix: ["na"] })
      expect(result.spec.joiner).toBeUndefined()
    }
  })

  it("rejects incorrect version", () => {
    const result = validateReduplicationTemplateSpec({
      version: 2,
      base: "stem",
      placement: "prefix",
      copy: { mode: "full" }
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.issues.some(issue => issue.path === "version")).toBe(true)
    }
  })

  it("rejects partial mode without segment count", () => {
    const result = validateReduplicationTemplateSpec({
      version: 1,
      base: "stem",
      placement: "suffix",
      copy: { mode: "partial" }
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.issues.find(issue => issue.path === "copy.segments")).toBeTruthy()
      expect(result.issues.find(issue => issue.path === "copy.scope")).toBeTruthy()
    }
  })

  it("reports invalid JSON when parsing", () => {
    const result = parseReduplicationTemplateSpec("{ invalid json }")
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.issues[0].message).toMatch(/Expected property name/)
    }
  })
})
