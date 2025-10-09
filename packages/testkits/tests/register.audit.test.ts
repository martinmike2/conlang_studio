import { describe, it, expect } from "vitest"

import { evaluateStylePolicy, type StylePolicy } from "@core/register"

describe("evaluateStylePolicy", () => {
  const policy: StylePolicy = {
    id: 42,
    name: "High Register",
    description: "Ensure public-facing material remains polished",
    languageId: null,
    createdAt: new Date(),
    rules: [
      {
        id: "no-slang",
        description: "Avoid slang expressions",
        forbidWords: ["ain't", "gonna"],
        forbidPatterns: [],
        allowedRegisters: ["formal", "official"],
        requireTags: ["public"],
        maxSentenceLength: 40,
        minFormality: 0.6,
        metadata: {}
      },
      {
        id: "concise",
        description: "Keep sentences concise",
        forbidWords: [],
        forbidPatterns: [],
        allowedRegisters: [],
        requireTags: [],
        maxSentenceLength: 12,
        minFormality: undefined,
        metadata: {}
      }
    ]
  }

  it("passes samples that satisfy all rules", () => {
    const evaluation = evaluateStylePolicy(policy, [
      {
        id: "sample-pass",
        text: "We cordially invite you to our annual summit.",
        register: "formal",
        tags: ["public"],
        formality: 0.92
      }
    ])

    expect(evaluation.summary.evaluated).toBe(1)
    expect(evaluation.summary.failed).toBe(0)
    expect(evaluation.samples[0].violations).toHaveLength(0)
  })

  it("collects violations for register, tags, formality, and forbidden words", () => {
    const evaluation = evaluateStylePolicy(policy, [
      {
        id: undefined,
        text: "We're gonna announce it soon and it ain't secret.",
        register: "casual",
        tags: ["internal"],
        formality: 0.3
      }
    ])

    expect(evaluation.summary.failed).toBe(1)
    const sample = evaluation.samples[0]
    expect(sample.sampleId).toBe("sample-1")
    const reasons = sample.violations.map((v) => v.reason)
    expect(reasons).toEqual([
      'Forbidden word “ain\'t” detected',
      'Forbidden word “gonna” detected',
      'Register “casual” is not allowed',
      'Missing required tags',
      'Formality score 0.30 below minimum 0.6'
    ])
  })

  it("flags sentences that exceed maximum length and invalid regex patterns", () => {
    const extendedPolicy: StylePolicy = {
      ...policy,
      rules: [
        ...policy.rules,
        {
          id: "invalid-pattern",
          description: "Broken pattern should still surface",
          forbidWords: [],
          forbidPatterns: ["[unterminated"],
          allowedRegisters: [],
          requireTags: [],
          maxSentenceLength: undefined,
          minFormality: undefined,
          metadata: {}
        }
      ]
    }

    const evaluation = evaluateStylePolicy(extendedPolicy, [
      {
        id: "sample-long",
        text: "This sentence meanders thoughtfully across numerous clauses and provides excessive detail far beyond what the policy recommends for succinct communication.",
        register: "formal",
        tags: ["public"],
        formality: 0.85
      }
    ])

    const sample = evaluation.samples[0]
    expect(sample.violations.some((v) => v.reason.includes("Invalid pattern"))).toBe(true)
    expect(sample.violations.some((v) => v.reason.includes("Sentence length"))).toBe(true)
  })
})
