import { describe, it, expect } from "vitest"

import {
  applyAblautToSegment,
  createAblautRegistry,
  getAblautGrade,
  parseAblautSchemeSpec,
  stringifyAblautSchemeSpec,
  validateAblautSchemeSpec
} from "@core/morphology"
import type { AblautGradeDefinition, AblautSchemeDescriptor, AblautSchemeSpec, AblautSchemeValidationIssue } from "@core/morphology"

describe("Ablaut scheme registry", () => {
  function buildSpec(): AblautSchemeSpec {
    const candidate = {
      version: 1 as const,
      vowels: ["a", "e", "o"],
      defaultGrade: "e-grade",
      grades: [
        {
          key: "e-grade",
          label: "E Grade",
          mapping: { a: "e" }
        },
        {
          key: "o-grade",
          aliases: ["ablaut-o"],
          mapping: { a: "o", e: "o" }
        }
      ]
    }

    const result = validateAblautSchemeSpec(candidate)
    if (!result.valid) {
      throw new Error(`fixture spec invalid: ${JSON.stringify(result.issues)}`)
    }
    return result.spec
  }

  it("accepts a conforming spec and normalizes values", () => {
    const result = validateAblautSchemeSpec({
      version: 1,
      vowels: [" a ", "e"],
      defaultGrade: "e-grade",
      grades: [
        {
          key: " e-grade ",
          mapping: { "a ": " e " }
        },
        {
          key: "o-grade",
          mapping: { e: "o" }
        }
      ]
    })

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.spec.vowels).toEqual(["a", "e"])
      expect(result.spec.grades[0].key).toBe("e-grade")
      expect(result.spec.grades[0].mapping).toEqual({ a: "e" })
    }
  })

  it("rejects invalid specs with descriptive issues", () => {
    const result = validateAblautSchemeSpec({
      version: 2,
      vowels: [],
      defaultGrade: "missing",
      grades: []
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      const issues = result.issues
      expect(issues.some((issue: AblautSchemeValidationIssue) => issue.path === "version")).toBe(true)
      expect(issues.some((issue: AblautSchemeValidationIssue) => issue.path === "vowels")).toBe(true)
      expect(issues.some((issue: AblautSchemeValidationIssue) => issue.path === "grades")).toBe(true)
      expect(issues.some((issue: AblautSchemeValidationIssue) => issue.path === "defaultGrade")).toBe(true)
    }
  })

  it("round-trips a spec via JSON helpers", () => {
    const spec = buildSpec()
    const roundTrip = parseAblautSchemeSpec(stringifyAblautSchemeSpec(spec))
    expect(roundTrip.valid).toBe(true)
  })

  it("registers, updates, and removes schemes via the registry", () => {
    const spec = buildSpec()
    const registry = createAblautRegistry()
    const entry: AblautSchemeDescriptor = {
      id: "proto",
      name: "Proto Ablaut",
      description: "Test scheme",
      spec
    }

    registry.register(entry)
    expect(registry.get("proto")?.name).toBe("Proto Ablaut")
    expect(registry.getByName("proto ablaut")?.id).toBe("proto")
    expect(registry.list()).toHaveLength(1)

    const updatedGrades = spec.grades.map((grade): AblautGradeDefinition =>
      grade.key === "o-grade"
        ? { ...grade, mapping: { ...grade.mapping, o: "u" } }
        : grade
    )

    const updatedSpec: AblautSchemeSpec = {
      ...spec,
      grades: updatedGrades
    }

    registry.upsert({ ...entry, spec: updatedSpec })
    expect(registry.get("proto")?.spec.grades.find((g: AblautGradeDefinition) => g.key === "o-grade")?.mapping).toEqual({ a: "o", e: "o", o: "u" })

    const removed = registry.remove("proto")
    expect(removed).toBe(true)
    expect(registry.list()).toHaveLength(0)
  })

  it("applies ablaut mappings with grade aliases and fallbacks", () => {
    const spec = buildSpec()
    const eGrade = getAblautGrade(spec, "e-grade")
    expect(eGrade?.mapping.a).toBe("e")

    const transformed = applyAblautToSegment("a", spec, "ablaut-o")
    expect(transformed).toBe("o")

    const fallback = applyAblautToSegment("i", spec, "ablaut-o", { fallback: "original" })
    expect(fallback).toBe("i")

    const missingGrade = applyAblautToSegment("a", spec, "unknown", { fallback: null })
    expect(missingGrade).toBeNull()
  })
})
